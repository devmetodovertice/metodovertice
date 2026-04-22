import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { statusLimiter, getIp } from '@/lib/ratelimit'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  if (statusLimiter) {
    const { success } = await statusLimiter.limit(getIp(req))
    if (!success) return NextResponse.json({ error: 'Rate limit atingido' }, { status: 429 })
  }

  const supabase = createServerClient()
  const { data } = await supabase
    .from('submissions')
    .select('status')
    .eq('access_token', token)
    .single()

  if (!data) return NextResponse.json({ error: 'Token inválido' }, { status: 404 })

  return NextResponse.json({ status: data.status })
}
