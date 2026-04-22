import { NextRequest, NextResponse } from 'next/server'
import { createSessionClient } from '@/lib/supabase/server-session'

// Supabase redireciona para cá após verificar magic link / invite / recovery.
// Troca o code PKCE por uma sessão e redireciona para criação de senha.

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createSessionClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=link_expirado`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/set-password`)
}
