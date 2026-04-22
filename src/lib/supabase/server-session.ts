import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Cliente com sessão do usuário — usa anon key + cookies do request.
// Use para verificar/ler a sessão do usuário logado em Server Components e Route Handlers.
export async function createSessionClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: ()               => cookieStore.getAll(),
        setAll: (cookiesToSet)   => {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        },
      },
    }
  )
}
