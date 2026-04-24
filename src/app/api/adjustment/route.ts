import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { createSessionClient } from '@/lib/supabase/server-session'
import { adjustLimiter, getIp } from '@/lib/ratelimit'

const schema = z.object({
  submission_id: z.string().uuid(),
  message:       z.string().min(10).max(2000),
})

export async function POST(req: NextRequest) {
  if (adjustLimiter) {
    const { success } = await adjustLimiter.limit(getIp(req))
    if (!success) return NextResponse.json({ error: 'Rate limit atingido' }, { status: 429 })
  }

  // Verificar autenticação
  const session = await createSessionClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const formData = await req.formData()
  const parsed = schema.safeParse({
    submission_id: formData.get('submission_id'),
    message:       formData.get('message'),
  })

  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Verificar que a submission pertence ao usuário autenticado
  const { data: submission } = await supabase
    .from('submissions')
    .select('id, status')
    .eq('id', parsed.data.submission_id)
    .eq('user_id', user.id)
    .single()

  if (!submission || submission.status !== 'completed') {
    return NextResponse.json({ error: 'Submissão inválida' }, { status: 404 })
  }

  await supabase.from('adjustments').insert({
    submission_id: parsed.data.submission_id,
    message:       parsed.data.message,
  })

  const referer = req.headers.get('referer') || '/dashboard'
  return NextResponse.redirect(new URL(referer), { status: 303 })
}
