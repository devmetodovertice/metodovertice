import { NextRequest, NextResponse } from 'next/server'
import { runPipeline } from '@/lib/pipeline'
import { log } from '@/lib/logger'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-pipeline-secret')
  if (!secret || secret !== process.env.PIPELINE_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { submission_id } = body

  if (!submission_id || typeof submission_id !== 'string') {
    return NextResponse.json({ error: 'submission_id obrigatório' }, { status: 400 })
  }

  try {
    await runPipeline(submission_id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    log('error', 'pipeline.route_failed', { submissionId: submission_id, error: message })
    // 5xx faz QStash retentar automaticamente
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
