import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL

export async function sendInviteEmail(to: string, inviteLink: string) {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: 'Método Vértice — crie sua senha e acesse seu currículo',
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><style>
  body { margin:0; font-family: -apple-system, system-ui, sans-serif; background:#f5f5f5; }
  .wrap { max-width:520px; margin:40px auto; }
  .card { background:#fff; border-radius:12px; overflow:hidden; }
  .top  { background:#0a0a0a; padding:28px 36px; }
  .logo { font-size:20px; font-weight:800; color:#fff; letter-spacing:-0.5px; }
  .body { padding:36px; }
  h2   { font-size:20px; font-weight:700; color:#111; margin:0 0 10px; }
  p    { font-size:14px; color:#555; line-height:1.6; margin:0 0 20px; }
  .btn { display:block; text-align:center; background:#111; color:#fff !important;
         text-decoration:none; padding:14px 28px; border-radius:8px;
         font-size:15px; font-weight:600; margin:28px 0; }
  .note { font-size:12px; color:#aaa; }
</style></head>
<body><div class="wrap"><div class="card">
  <div class="top"><div class="logo">Método Vértice</div></div>
  <div class="body">
    <h2>Seu acesso está pronto.</h2>
    <p>Clique no botão abaixo para criar sua senha e acessar a plataforma onde você vai preencher as informações para gerar seu currículo.</p>
    <a href="${inviteLink}" class="btn">Criar senha e acessar →</a>
    <p class="note">Este link expira em 24 horas. Não compartilhe com ninguém.</p>
  </div>
</div></div></body></html>`,
  })
}

export async function sendFormEmail(to: string, token: string) {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: 'Método Vértice — preencha seu formulário',
    html: `
      <p>Olá! Seu acesso foi criado.</p>
      <p>Acesse o link abaixo para preencher seu formulário:</p>
      <p><a href="${APP_URL}/formulario/${token}">${APP_URL}/formulario/${token}</a></p>
      <p>Este link é único e exclusivo para você. Não compartilhe.</p>
    `,
  })
}

export async function sendDeliveryEmail(token: string) {
  const supabase = (await import('@/lib/supabase/server')).createServerClient()

  const { data } = await supabase
    .from('submissions')
    .select('customer_email')
    .eq('access_token', token)
    .single()

  if (!data?.customer_email) return

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: data.customer_email,
    subject: 'Seu currículo está pronto — Método Vértice',
    html: `
      <p>Seu currículo foi gerado com sucesso!</p>
      <p>Acesse o link abaixo para baixar:</p>
      <p><a href="${APP_URL}/entrega/${token}">${APP_URL}/entrega/${token}</a></p>
    `,
  })
}
