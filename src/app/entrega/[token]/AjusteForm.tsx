'use client'

import { useState } from 'react'

export default function AjusteForm({ submissionId }: { submissionId: string }) {
  const [sent, setSent] = useState(false)

  if (sent) {
    return (
      <details open>
        <summary style={{ color: '#555', cursor: 'default' }}>Solicitação enviada</summary>
        <p style={{ marginTop: 12, color: '#555', fontSize: 14 }}>
          Recebemos seu pedido. Nossa equipe vai revisar e você receberá um e-mail quando o currículo atualizado estiver disponível.
        </p>
      </details>
    )
  }

  return (
    <details>
      <summary>Solicitar ajuste</summary>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          const res = await fetch('/api/adjustment', { method: 'POST', body: fd })
          if (res.ok || res.redirected) setSent(true)
        }}
      >
        <input type="hidden" name="submission_id" value={submissionId} />
        <textarea
          name="message"
          placeholder="Descreva o que gostaria de ajustar no currículo…"
          required
          minLength={10}
          maxLength={2000}
        />
        <br />
        <button type="submit" className="btn-ajuste">
          Enviar solicitação
        </button>
      </form>
    </details>
  )
}
