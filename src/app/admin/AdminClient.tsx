'use client'

import { useState } from 'react'

interface Adjustment { id: string }
interface SubmissionData { nome_completo: string | null; cargo_alvo: string | null }
interface Submission {
  id: string
  status: string
  error_message: string | null
  submitted_at: string | null
  pdf_url: string | null
  access_token: string
  submission_data: SubmissionData | null
  adjustments: Adjustment[]
}

const STATUS_COLOR: Record<string, string> = {
  pending:    '#888',
  processing: '#f5a623',
  completed:  '#4caf50',
  failed:     '#f44336',
}

export default function AdminClient({ submissions }: { submissions: Submission[] }) {
  const [email, setEmail]         = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [result, setResult]       = useState<{ ok: boolean; text: string } | null>(null)
  const [open, setOpen]           = useState(false)

  async function handleCreate() {
    const res  = await fetch('/api/admin/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, send_email: sendEmail }),
    })
    const data = await res.json()
    setResult(res.ok
      ? { ok: true,  text: `Link gerado: ${data.link}` }
      : { ok: false, text: `Erro: ${data.error}` }
    )
  }

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Admin — Vértice</title>
        <style>{css}</style>
      </head>
      <body>
        <header>
          <h1>Painel Admin <span>Método Vértice</span></h1>
          <button className="btn-primary" style={{ fontSize: 13, padding: '8px 16px' }} onClick={() => { setOpen(true); setResult(null); setEmail('') }}>
            + Nova submissão
          </button>
        </header>

        <main>
          <table>
            <thead>
              <tr>
                <th>Nome</th><th>Cargo alvo</th><th>Status</th>
                <th>Enviado em</th><th>Ajustes</th><th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => (
                <tr key={sub.id}>
                  <td>{sub.submission_data?.nome_completo ?? <span style={{ color: '#333' }}>—</span>}</td>
                  <td>{sub.submission_data?.cargo_alvo ?? <span style={{ color: '#333' }}>—</span>}</td>
                  <td>
                    <span className="status" style={{ color: STATUS_COLOR[sub.status] ?? '#888', background: '#111' }}>
                      {sub.status}
                    </span>
                    {sub.error_message && (
                      <div className="error-msg" title={sub.error_message}>{sub.error_message}</div>
                    )}
                  </td>
                  <td>{sub.submitted_at ? new Date(sub.submitted_at).toLocaleString('pt-BR') : <span style={{ color: '#333' }}>—</span>}</td>
                  <td>
                    {sub.adjustments.length > 0
                      ? <span className="badge-ajuste">{sub.adjustments.length} ajuste{sub.adjustments.length > 1 ? 's' : ''}</span>
                      : <span style={{ color: '#333' }}>—</span>}
                  </td>
                  <td style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {sub.pdf_url && (
                      <a href={`/api/admin/pdf?id=${sub.id}`} className="action" target="_blank" rel="noreferrer">Ver PDF</a>
                    )}
                    {(sub.status === 'failed' || sub.status === 'completed') && (
                      <form action="/api/admin/reprocess" method="POST" style={{ display: 'inline' }}>
                        <input type="hidden" name="submission_id" value={sub.id} />
                        <button type="submit" className="action">Reprocessar</button>
                      </form>
                    )}
                    {sub.status === 'pending' && sub.access_token && (
                      <a href={`/formulario/${sub.access_token}`} className="action" target="_blank" rel="noreferrer">Ver link</a>
                    )}
                  </td>
                </tr>
              ))}
              {submissions.length === 0 && (
                <tr><td colSpan={6} style={{ color: '#333', textAlign: 'center', padding: 40 }}>Nenhuma submissão ainda.</td></tr>
              )}
            </tbody>
          </table>
        </main>

        {open && (
          <div style={overlay} onClick={() => setOpen(false)}>
            <div style={modal} onClick={e => e.stopPropagation()}>
              <h2>Nova submissão</h2>
              <div className="field">
                <label>E-mail do cliente</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="cliente@email.com" />
              </div>
              <div className="check-row">
                <input type="checkbox" id="send-check" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} />
                <label htmlFor="send-check">Enviar e-mail com link do formulário</label>
              </div>
              <div>
                <button className="btn-primary" onClick={handleCreate}>Criar</button>
                <button className="btn-cancel" onClick={() => setOpen(false)}>Cancelar</button>
              </div>
              {result && (
                <div style={{ marginTop: 16, padding: 12, background: result.ok ? '#0d1f0d' : '#1f0d0d', border: `1px solid ${result.ok ? '#1a3a1a' : '#3a1a1a'}`, borderRadius: 6, fontSize: 12, color: result.ok ? '#4caf50' : '#f44336', wordBreak: 'break-all' }}>
                  {result.text}
                </div>
              )}
            </div>
          </div>
        )}
      </body>
    </html>
  )
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
}
const modal: React.CSSProperties = {
  background: '#111', border: '1px solid #222', borderRadius: 12,
  padding: 28, color: '#fff', minWidth: 380,
}

const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0a0a; color: #fff; font-family: system-ui, -apple-system, sans-serif; font-size: 14px; }
  header { padding: 24px 40px; border-bottom: 1px solid #1a1a1a; display: flex; align-items: center; justify-content: space-between; }
  h1 { font-size: 18px; font-weight: 600; color: #fff; }
  h1 span { color: #444; font-weight: 400; margin-left: 8px; }
  main { padding: 24px 40px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; padding: 10px 12px; color: #555; font-weight: 500; border-bottom: 1px solid #1a1a1a; white-space: nowrap; }
  td { padding: 12px; border-bottom: 1px solid #111; vertical-align: top; }
  tr:hover td { background: #0f0f0f; }
  .status { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
  .badge-ajuste { background: #1a1a1a; color: #f5a623; padding: 2px 6px; border-radius: 4px; font-size: 11px; }
  .action { color: #555; background: none; border: none; cursor: pointer; font-size: 13px; padding: 4px 0; text-decoration: underline; }
  .action:hover { color: #fff; }
  a.action { display: inline-block; }
  .error-msg { color: #f44336; font-size: 12px; margin-top: 4px; max-width: 280px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
  label { font-size: 12px; color: #888; }
  input[type=email] { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 6px; padding: 10px 12px; color: #fff; font-size: 14px; outline: none; width: 100%; }
  input[type=email]:focus { border-color: #444; }
  .check-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #888; margin-bottom: 20px; }
  .btn-primary { background: #fff; color: #000; border: none; border-radius: 6px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; }
  .btn-cancel { background: none; border: none; color: #555; font-size: 13px; cursor: pointer; margin-left: 12px; text-decoration: underline; }
  h2 { font-size: 16px; font-weight: 600; margin-bottom: 20px; }
`
