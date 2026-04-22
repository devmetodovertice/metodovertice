import { createServerClient } from '@/lib/supabase/server'

export default async function AdminPage() {
  const supabase = createServerClient()

  const { data: submissions } = await supabase
    .from('submissions')
    .select('*, submission_data(*), adjustments(*)')
    .order('created_at', { ascending: false })
    .limit(100)

  const statusColor: Record<string, string> = {
    pending:    '#888',
    processing: '#f5a623',
    completed:  '#4caf50',
    failed:     '#f44336',
  }

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Admin — Vértice</title>
        <style>{`
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
          dialog { background: #111; border: 1px solid #222; border-radius: 12px; padding: 28px; color: #fff; min-width: 380px; }
          dialog::backdrop { background: rgba(0,0,0,.7); }
          dialog h2 { font-size: 16px; font-weight: 600; margin-bottom: 20px; }
          .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
          label { font-size: 12px; color: #888; }
          input[type=email] { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 6px; padding: 10px 12px; color: #fff; font-size: 14px; outline: none; width: 100%; }
          input[type=email]:focus { border-color: #444; }
          .check-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #888; margin-bottom: 20px; }
          .btn-primary { background: #fff; color: #000; border: none; border-radius: 6px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; }
          .btn-cancel { background: none; border: none; color: #555; font-size: 13px; cursor: pointer; margin-left: 12px; text-decoration: underline; }
          #result-box { margin-top: 16px; padding: 12px; background: #0d1f0d; border: 1px solid #1a3a1a; border-radius: 6px; font-size: 12px; color: #4caf50; word-break: break-all; display: none; }
        `}</style>
      </head>
      <body>
        <header>
          <h1>Painel Admin <span>Método Vértice</span></h1>
          <button
            className="btn-primary"
            style={{ fontSize: 13, padding: '8px 16px' }}
            onClick={() => (document.getElementById('modal-nova') as HTMLDialogElement)?.showModal()}
          >
            + Nova submissão
          </button>
        </header>

        <main>
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Cargo alvo</th>
                <th>Status</th>
                <th>Enviado em</th>
                <th>Ajustes</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {submissions?.map((sub) => (
                <tr key={sub.id}>
                  <td>{sub.submission_data?.nome_completo ?? <span style={{ color: '#333' }}>—</span>}</td>
                  <td>{sub.submission_data?.cargo_alvo ?? <span style={{ color: '#333' }}>—</span>}</td>
                  <td>
                    <span className="status" style={{ color: statusColor[sub.status] ?? '#888', background: '#111' }}>
                      {sub.status}
                    </span>
                    {sub.error_message && (
                      <div className="error-msg" title={sub.error_message}>{sub.error_message}</div>
                    )}
                  </td>
                  <td>
                    {sub.submitted_at
                      ? new Date(sub.submitted_at).toLocaleString('pt-BR')
                      : <span style={{ color: '#333' }}>—</span>}
                  </td>
                  <td>
                    {sub.adjustments?.length > 0
                      ? <span className="badge-ajuste">{sub.adjustments.length} ajuste{sub.adjustments.length > 1 ? 's' : ''}</span>
                      : <span style={{ color: '#333' }}>—</span>}
                  </td>
                  <td style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {sub.pdf_url && (
                      <a href={`/api/admin/pdf?id=${sub.id}`} className="action" target="_blank" rel="noreferrer">
                        Ver PDF
                      </a>
                    )}
                    {(sub.status === 'failed' || sub.status === 'completed') && (
                      <form action="/api/admin/reprocess" method="POST" style={{ display: 'inline' }}>
                        <input type="hidden" name="submission_id" value={sub.id} />
                        <button type="submit" className="action">Reprocessar</button>
                      </form>
                    )}
                    {sub.status === 'pending' && sub.access_token && (
                      <a
                        href={`/formulario/${sub.access_token}`}
                        className="action"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Ver link
                      </a>
                    )}
                  </td>
                </tr>
              ))}
              {(!submissions || submissions.length === 0) && (
                <tr>
                  <td colSpan={6} style={{ color: '#333', textAlign: 'center', padding: 40 }}>
                    Nenhuma submissão ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </main>

        {/* Modal nova submissão */}
        <dialog id="modal-nova">
          <h2>Nova submissão</h2>
          <div className="field">
            <label htmlFor="email-input">E-mail do cliente</label>
            <input type="email" id="email-input" placeholder="cliente@email.com" />
          </div>
          <div className="check-row">
            <input type="checkbox" id="send-email-check" defaultChecked />
            <label htmlFor="send-email-check">Enviar e-mail com link do formulário</label>
          </div>
          <div>
            <button
              className="btn-primary"
              onClick={async () => {
                const email = (document.getElementById('email-input') as HTMLInputElement)?.value
                const sendEmail = (document.getElementById('send-email-check') as HTMLInputElement)?.checked
                const res = await fetch('/api/admin/submissions', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email, send_email: sendEmail }),
                })
                const data = await res.json()
                const box = document.getElementById('result-box')!
                if (res.ok) {
                  box.style.display = 'block'
                  box.textContent = `Link gerado: ${data.link}`
                } else {
                  box.style.display = 'block'
                  box.style.color = '#f44336'
                  box.style.borderColor = '#3a1a1a'
                  box.style.background = '#1f0d0d'
                  box.textContent = `Erro: ${data.error}`
                }
              }}
            >
              Criar
            </button>
            <button
              className="btn-cancel"
              onClick={() => {
                ;(document.getElementById('modal-nova') as HTMLDialogElement)?.close()
                ;(document.getElementById('result-box') as HTMLElement).style.display = 'none'
              }}
            >
              Cancelar
            </button>
          </div>
          <div id="result-box" />
        </dialog>
      </body>
    </html>
  )
}
