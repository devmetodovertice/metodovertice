import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { nanoid } from 'nanoid'
import { createServerClient } from '@/lib/supabase/server'
import { sendInviteEmail } from '@/lib/email/resend'
import { log } from '@/lib/logger'

// ── Validação de assinatura HMAC-SHA256 ──────────────────────────────────────
// A maioria dos gateways brasileiros (Kiwify, Hotmart, Eduzz, etc.) usa este padrão.
// Configure PAYMENT_WEBHOOK_SECRET com o segredo fornecido pelo gateway.

function verifySignature(body: string, signature: string, secret: string): boolean {
  try {
    const expected = createHmac('sha256', secret).update(body).digest('hex')
    const a = Buffer.from(signature.replace(/^sha256=/, ''), 'hex')
    const b = Buffer.from(expected, 'hex')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

// ── Normalização por gateway ──────────────────────────────────────────────────
// Adapte esta função para o payload do seu gateway específico.

interface PaymentData {
  email:      string
  paymentId:  string
  customerName?: string
}

function parsePayload(body: Record<string, unknown>): PaymentData | null {
  // Kiwify
  if (body.order_id && body.Customer) {
    const c = body.Customer as Record<string, string>
    return {
      email:        c.email,
      paymentId:    body.order_id as string,
      customerName: c.full_name,
    }
  }

  // Hotmart
  if (body.data && typeof body.data === 'object') {
    const d = body.data as Record<string, unknown>
    const buyer = d.buyer as Record<string, string> | undefined
    return buyer?.email
      ? { email: buyer.email, paymentId: d.purchase?.toString() ?? nanoid(16), customerName: buyer.name }
      : null
  }

  // Genérico — espera { email, payment_id }
  if (typeof body.email === 'string' && typeof body.payment_id === 'string') {
    return { email: body.email, paymentId: body.payment_id }
  }

  return null
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  // Verificar assinatura
  const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET
  if (webhookSecret) {
    const signature =
      req.headers.get('x-signature') ??
      req.headers.get('x-hub-signature-256') ??
      req.headers.get('x-kiwify-signature') ?? ''

    if (!verifySignature(rawBody, signature, webhookSecret)) {
      log('warn', 'webhook.invalid_signature')
      return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })
    }
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const payment = parsePayload(body)
  if (!payment?.email || !payment?.paymentId) {
    log('warn', 'webhook.unrecognized_payload', { keys: Object.keys(body) })
    return NextResponse.json({ error: 'Formato de payload não reconhecido' }, { status: 400 })
  }

  const supabase = createServerClient()

  // ── Idempotência: ignorar pagamento já processado ──────────────────────────
  const { data: existing } = await supabase
    .from('submissions')
    .select('id')
    .eq('payment_id', payment.paymentId)
    .single()

  if (existing) {
    log('info', 'webhook.duplicate', { paymentId: payment.paymentId })
    return NextResponse.json({ ok: true, duplicate: true })
  }

  // ── Criar usuário no Supabase Auth + link de convite ───────────────────────
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  const email = payment.email

  type GeneratedLink = { userId: string; inviteUrl: string }

  async function generateAccessLink(): Promise<GeneratedLink | null> {
    const redirectTo = `${appUrl}/auth/callback`

    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { redirectTo },
    })

    if (!error && data) {
      return { userId: data.user.id, inviteUrl: data.properties.action_link }
    }

    // Usuário já existe — gerar link de recuperação
    const { data: rd, error: re } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    })

    if (re || !rd) return null
    return { userId: rd.user.id, inviteUrl: rd.properties.action_link }
  }

  const link = await generateAccessLink()
  if (!link) {
    log('error', 'webhook.link_generation_failed', { email: payment.email })
    return NextResponse.json({ error: 'Falha ao gerar link de acesso' }, { status: 500 })
  }

  const { userId, inviteUrl } = link

  // ── Criar submissão vinculada ao usuário ──────────────────────────────────
  const token = nanoid(32)

  const { data: submission, error: insertError } = await supabase
    .from('submissions')
    .insert({
      access_token: token,
      customer_email: payment.email,
      user_id:     userId,
      payment_id:  payment.paymentId,
      status:      'pending',
    })
    .select('id')
    .single()

  if (insertError || !submission) {
    log('error', 'webhook.submission_insert_failed', { email: payment.email, error: insertError?.message })
    return NextResponse.json({ error: 'Erro ao criar submissão' }, { status: 500 })
  }

  // ── Enviar email de convite com link de acesso ────────────────────────────
  await sendInviteEmail(payment.email, inviteUrl).catch((err) =>
    log('warn', 'webhook.invite_email_failed', { email: payment.email, error: String(err) })
  )

  log('info', 'webhook.processed', { paymentId: payment.paymentId, submissionId: submission.id })
  return NextResponse.json({ ok: true })
}
