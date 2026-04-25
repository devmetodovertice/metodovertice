'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SetPasswordPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [password, setPassword]   = useState('')
  const [confirm,  setConfirm]    = useState('')
  const [error,    setError]      = useState<string | null>(null)
  const [loading,  setLoading]    = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('A senha precisa ter pelo menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError('Não foi possível salvar a senha. O link pode ter expirado — volte ao e-mail e tente novamente.')
      return
    }

    router.push('/dashboard')
  }

  return (
    <main style={s.main}>
      <div style={s.card}>
        <p style={s.label}>Método Vértice</p>
        <h1 style={s.title}>Crie sua senha</h1>
        <p style={s.sub}>Você vai usar essa senha para acessar a plataforma nas próximas vezes.</p>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.field}>
            <label style={s.fieldLabel}>Nova senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              style={s.input}
            />
          </div>
          <div style={s.field}>
            <label style={s.fieldLabel}>Confirmar senha</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repita a senha"
              required
              style={s.input}
            />
          </div>

          {error && <p style={s.error}>{error}</p>}

          <button type="submit" disabled={loading} style={s.btn}>
            {loading ? 'Salvando...' : 'Salvar senha e continuar →'}
          </button>
        </form>
      </div>
    </main>
  )
}

const s: Record<string, React.CSSProperties> = {
  main: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: '#0a0a0a', padding: 24,
  },
  card: {
    width: '100%', maxWidth: 420, background: '#111',
    borderRadius: 16, padding: '40px 36px', border: '1px solid #1e1e1e',
  },
  label:      { fontSize: 11, color: '#555', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 },
  title:      { fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: -0.5, marginBottom: 8 },
  sub:        { fontSize: 14, color: '#666', lineHeight: 1.6, marginBottom: 28 },
  form:       { display: 'flex', flexDirection: 'column', gap: 16 },
  field:      { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldLabel: { fontSize: 12, color: '#888' },
  input: {
    background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8,
    padding: '11px 14px', color: '#fff', fontSize: 14, outline: 'none',
  },
  error:  { fontSize: 13, color: '#f87171', marginTop: -4 },
  btn: {
    marginTop: 8, background: '#fff', color: '#000', border: 'none',
    borderRadius: 8, padding: '13px 20px', fontSize: 15, fontWeight: 600,
    cursor: 'pointer', transition: 'opacity .15s',
  },
}
