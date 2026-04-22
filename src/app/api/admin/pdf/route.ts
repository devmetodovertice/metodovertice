import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: submission } = await supabase
    .from('submissions')
    .select('pdf_url')
    .eq('id', id)
    .single()

  if (!submission?.pdf_url) {
    return NextResponse.json({ error: 'PDF não encontrado' }, { status: 404 })
  }

  const { data } = await supabase.storage
    .from('vertice-pdfs')
    .createSignedUrl(submission.pdf_url, 3600)

  if (!data?.signedUrl) {
    return NextResponse.json({ error: 'Erro ao gerar URL' }, { status: 500 })
  }

  return NextResponse.redirect(data.signedUrl)
}
