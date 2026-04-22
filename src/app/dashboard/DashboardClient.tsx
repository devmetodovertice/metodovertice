'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Submission {
  id:           string
  accessToken:  string
  status:       string
  errorMessage: string | null
  pdfSignedUrl: string | null
}

interface Props {
  submission: Submission | null
}

export default function DashboardClient({ submission: initial }: Props) {
  const router = useRouter()
  const [sub, setSub] = useState(initial)

  // Polling enquanto processing
  useEffect(() => {
    if (!sub || sub.status !== 'processing') return

    let active = true

    async function poll() {
      if (!sub || !active) return
      try {
        const res = await fetch(`/api/status/${sub.accessToken}`)
        if (!res.ok) return
        const { status } = await res.json()
        if (!active) return
        if (status === 'completed') {
          // Recarrega a página para pegar a signed URL do servidor
          router.refresh()
        } else if (status !== 'failed') {
          setTimeout(poll, 5000)
        } else {
          setSub(s => s ? { ...s, status } : s)
        }
      } catch {
        if (active) setTimeout(poll, 5000)
      }
    }

    setTimeout(poll, 5000)
    return () => { active = false }
  }, [sub?.status])

  return (
    <main style={s.main}>
      <div style={s.wrap}>
        <p style={s.brand}>Método Vértice</p>

        {!sub && <EmptyState />}
        {sub?.status === 'pending'     && <PendingState token={sub.accessToken} />}
        {sub?.status === 'processing'  && <ProcessingState />}
        {sub?.status === 'completed'   && <CompletedState pdfUrl={sub.pdfSignedUrl} submissionId={sub.id} />}
        {sub?.status === 'failed'      && <FailedState message={sub.errorMessage} />}
      </div>
    </main>
  )
}

function EmptyState() {
  return (
    <div style={s.card}>
      <h1 style={s.title}>Nenhum currículo encontrado</h1>
      <p style={s.body}>Sua compra ainda está sendo processada. Se o problema persistir, entre em contato com o suporte.</p>
    </div>
  )
}

function PendingState({ token }: { token: string }) {
  return (
    <div style={s.card}>
      <StatusDot color="#f5a623" />
      <h1 style={s.title}>Preencha seu formulário</h1>
      <p style={s.body}>Responda as perguntas sobre sua trajetória profissional. Leva de 15 a 20 minutos.</p>
      <a href={`/formulario/${token}`} style={s.btnPrimary}>
        Começar agora →
      </a>
    </div>
  )
}

function ProcessingState() {
  return (
    <div style={s.card}>
      <div style={s.spinner} />
      <h1 style={s.title}>Gerando seu currículo</h1>
      <p style={s.body}>Estamos analisando suas respostas e construindo seu currículo. Isso leva entre 1 e 2 minutos.</p>
    </div>
  )
}

function CompletedState({ pdfUrl, submissionId }: { pdfUrl: string | null; submissionId: string }) {
  const [sent, setSent] = useState(false)
  const [adj,  setAdj]  = useState('')

  return (
    <div style={s.card}>
      <StatusDot color="#4caf50" />
      <h1 style={s.title}>Seu currículo está pronto.</h1>
      {pdfUrl ? (
        <a href={pdfUrl} download="curriculo-vertice.pdf" style={s.btnPrimary}>
          Baixar PDF →
        </a>
      ) : (
        <p style={s.body}>O link de download expirou. Recarregue a página.</p>
      )}

      <div style={s.divider} />

      {sent ? (
        <p style={s.bodyMuted}>Pedido de ajuste enviado. Nossa equipe vai analisar em breve.</p>
      ) : (
        <>
          <p style={s.bodyMuted}>Quer ajustar algo no currículo?</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const fd = new FormData()
              fd.append('submission_id', submissionId)
              fd.append('message', adj)
              await fetch('/api/adjustment', { method: 'POST', body: fd })
              setSent(true)
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <textarea
              value={adj}
              onChange={e => setAdj(e.target.value)}
              placeholder="Descreva o que você quer ajustar..."
              minLength={10}
              maxLength={2000}
              required
              style={s.textarea}
            />
            <button type="submit" style={s.btnSecondary}>
              Solicitar ajuste
            </button>
          </form>
        </>
      )}
    </div>
  )
}

function FailedState({ message }: { message: string | null }) {
  return (
    <div style={s.card}>
      <StatusDot color="#f44336" />
      <h1 style={s.title}>Algo deu errado</h1>
      <p style={s.body}>
        {message ?? 'Houve um erro ao gerar seu currículo.'} Nossa equipe foi notificada e vai resolver em breve.
      </p>
    </div>
  )
}

function StatusDot({ color }: { color: string }) {
  return <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, marginBottom: 16 }} />
}

const s: Record<string, React.CSSProperties> = {
  main:  { minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  wrap:  { width: '100%', maxWidth: 480 },
  brand: { fontSize: 11, color: '#444', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 24 },
  card:  { background: '#111', border: '1px solid #1e1e1e', borderRadius: 16, padding: '36px 32px', display: 'flex', flexDirection: 'column', gap: 14 },
  title: { fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: -0.5, margin: 0 },
  body:  { fontSize: 14, color: '#666', lineHeight: 1.65, margin: 0 },
  bodyMuted: { fontSize: 13, color: '#555', margin: 0 },
  btnPrimary: {
    display: 'block', textAlign: 'center', background: '#fff', color: '#000',
    borderRadius: 8, padding: '13px 20px', fontSize: 15, fontWeight: 600,
    textDecoration: 'none', marginTop: 4,
  },
  btnSecondary: {
    background: '#1a1a1a', color: '#888', border: '1px solid #2a2a2a',
    borderRadius: 8, padding: '10px 16px', fontSize: 13, cursor: 'pointer',
  },
  divider:  { height: 1, background: '#1e1e1e', margin: '6px 0' },
  textarea: {
    background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8,
    padding: '11px 14px', color: '#fff', fontSize: 14, resize: 'vertical',
    minHeight: 90, fontFamily: 'inherit', outline: 'none',
  },
  spinner: {
    width: 36, height: 36, border: '2.5px solid #222',
    borderTop: '2.5px solid #fff', borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
}
