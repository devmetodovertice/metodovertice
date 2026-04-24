import { notFound, redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export default async function FormularioPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = createServerClient()

  const { data: submission } = await supabase
    .from('submissions')
    .select('status')
    .eq('access_token', token)
    .single()

  if (!submission) return notFound()

  if (submission.status !== 'pending') {
    redirect(`/aguardo/${token}`)
  }

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__VERTICE_TOKEN__ = ${JSON.stringify(token)};`,
          }}
        />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        <iframe
          src="/form/index.html"
          style={{ width: '100%', height: '100vh', border: 'none', display: 'block' }}
          title="Formulário Vértice"
        />
      </body>
    </html>
  )
}
