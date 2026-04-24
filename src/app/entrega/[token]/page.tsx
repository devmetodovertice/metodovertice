import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import AjusteForm from './AjusteForm'

export default async function EntregaPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = createServerClient()

  const { data: submission } = await supabase
    .from('submissions')
    .select('id, status, pdf_url')
    .eq('access_token', token)
    .single()

  if (!submission || submission.status !== 'completed') return notFound()

  const { data: signedUrl } = await supabase.storage
    .from('vertice-pdfs')
    .createSignedUrl(submission.pdf_url!, 3600)

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Seu currículo está pronto — Vértice</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #0a0a0a; color: #fff; font-family: system-ui, -apple-system, sans-serif; }
          main { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 32px; padding: 40px; text-align: center; }
          h1 { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
          .btn-download { display: inline-block; background: #fff; color: #000; padding: 14px 36px; border-radius: 8px; font-weight: 600; font-size: 16px; text-decoration: none; transition: opacity 0.2s; }
          .btn-download:hover { opacity: 0.85; }
          .divider { width: 40px; height: 1px; background: #222; }
          details { color: #555; font-size: 14px; }
          summary { cursor: pointer; color: #888; padding: 8px 0; list-style: none; }
          summary:hover { color: #aaa; }
          textarea { background: #111; border: 1px solid #2a2a2a; color: #fff; padding: 12px; border-radius: 6px; width: 360px; min-height: 100px; font-size: 14px; font-family: inherit; resize: vertical; margin-top: 16px; display: block; }
          textarea::placeholder { color: #444; }
          textarea:focus { outline: none; border-color: #444; }
          .btn-ajuste { background: #111; color: #888; border: 1px solid #2a2a2a; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; margin-top: 10px; transition: color 0.2s; }
          .btn-ajuste:hover { color: #fff; border-color: #444; }
        `}</style>
      </head>
      <body>
        <main>
          <h1>Seu currículo está pronto.</h1>
          <a
            href={signedUrl?.signedUrl}
            download="curriculo-vertice.pdf"
            className="btn-download"
          >
            Baixar currículo em PDF
          </a>
          <div className="divider" />
          <AjusteForm submissionId={submission.id} />
        </main>
      </body>
    </html>
  )
}
