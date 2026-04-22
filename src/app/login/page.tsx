'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const supabase     = createClient()

  const [email,   setEmail]   = useState('')
  const [pw,      setPw]      = useState('')
  const [error,   setError]   = useState<string | null>(
    searchParams.get('error') === 'link_expirado'
      ? 'Seu link de acesso expirou. Faça login com email e senha.'
      : null
  )
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: pw,
    })

    setLoading(false)

    if (authError) {
      setError('Email ou senha incorretos.')
      return
    }

    router.push('/dashboard')
  }

  return (
    <main style={s.main}>
      <div style={s.card}>
        <p style={s.label}>Método Vértice</p>
        <h1 style={s.title}>Entrar</h1>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.field}>
            <label style={s.fieldLabel}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              autoComplete="email"
              style={s.input}
            />
          </div>
          <div style={s.field}>
            <label style={s.fieldLabel}>Senha</label>
            <input
              type="password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              style={s.input}
            />
          </div>

          {error && <p style={s.error}>{error}</p>}

          <button type="submit" disabled={loading} style={s.btn}>
            {loading ? 'Entrando...' : 'Entrar →'}
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
    width: '100%', maxWidth: 400, background: '#111',
    borderRadius: 16, padding: '40px 36px', border: '1px solid #1e1e1e',
  },
  label:      { fontSize: 11, color: '#555', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 },
  title:      { fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: -0.5, marginBottom: 28 },
  form:       { display: 'flex', flexDirection: 'column', gap: 16 },
  field:      { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldLabel: { fontSize: 12, color: '#888' },
  input: {
    background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8,
    padding: '11px 14px', color: '#fff', fontSize: 14, outline: 'none',
  },
  error: { fontSize: 13, color: '#f87171', marginTop: -4 },
  btn: {
    marginTop: 8, background: '#fff', color: '#000', border: 'none',
    borderRadius: 8, padding: '13px 20px', fontSize: 15, fontWeight: 600,
    cursor: 'pointer',
  },
}
