import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { createServerClient } from '@/lib/supabase/server'
import { sendFormEmail } from '@/lib/email/resend'
import { log } from '@/lib/logger'

const schema = z.object({
  email:      z.string().email(),
  send_email: z.boolean().default(true),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'email obrigatório e válido' }, { status: 400 })
  }

  const { email, send_email } = parsed.data
  const supabase = createServerClient()
  const token = nanoid(32)

  const { data, error } = await supabase
    .from('submissions')
    .insert({ access_token: token, customer_email: email, status: 'pending' })
    .select('id, access_token')
    .single()

  if (error) {
    log('error', 'admin.create_submission_failed', { email, error: error.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (send_email) {
    await sendFormEmail(email, token).catch((err) =>
      log('warn', 'admin.form_email_failed', { submissionId: data.id, error: String(err) })
    )
  }

  log('info', 'admin.submission_created', { submissionId: data.id, email, emailSent: send_email })

  return NextResponse.json({
    id:   data.id,
    link: `${process.env.NEXT_PUBLIC_APP_URL}/formulario/${token}`,
  })
}
