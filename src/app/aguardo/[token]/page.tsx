'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AguardoPage({ params }: { params: { token: string } }) {
  const router = useRouter()
  const [status, setStatus] = useState<string>('processing')

  useEffect(() => {
    let active = true

    async function pollStatus() {
      try {
        const res = await fetch(`/api/status/${params.token}`)
        if (!res.ok) return
        const { status: s } = await res.json()
        if (!active) return
        setStatus(s)
        if (s === 'completed') {
          router.push(`/entrega/${params.token}`)
          return
        }
        if (s !== 'failed' && active) {
          setTimeout(pollStatus, 5000)
        }
      } catch {
        if (active) setTimeout(pollStatus, 5000)
      }
    }

    pollStatus()
    return () => { active = false }
  }, [params.token, router])

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Gerando seu currículo — Vértice</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #0a0a0a; color: #fff; font-family: system-ui, -apple-system, sans-serif; }
          main { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; padding: 40px; text-align: center; }
          .spinner { width: 48px; height: 48px; border: 3px solid #222; border-top: 3px solid #fff; border-radius: 50%; animation: spin 1s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
          h1 { font-size: 24px; font-weight: 600; letter-spacing: -0.5px; }
          p { color: #666; font-size: 15px; max-width: 380px; line-height: 1.6; }
        `}</style>
      </head>
      <body>
        <main>
          {status === 'failed' ? (
            <>
              <h1>Algo deu errado</h1>
              <p>Nossa equipe foi notificada e vai resolver em breve. Você receberá um e-mail quando seu currículo estiver pronto.</p>
            </>
          ) : (
            <>
              <div className="spinner" />
              <h1>Construindo seu currículo</h1>
              <p>Estamos analisando suas experiências e gerando um currículo personalizado. Isso leva entre 1 e 2 minutos.</p>
            </>
          )}
        </main>
      </body>
    </html>
  )
}
