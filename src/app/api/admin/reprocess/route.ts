import { NextRequest, NextResponse } from 'next/server'
import { Client as QStash } from '@upstash/qstash'
import { createServerClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const submission_id = formData.get('submission_id') as string

  if (!submission_id) {
    return NextResponse.json({ error: 'submission_id obrigatório' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { error } = await supabase
    .from('submissions')
    .update({ status: 'processing', retry_count: 0, error_message: null })
    .eq('id', submission_id)

  if (error) {
    return NextResponse.json({ error: 'Submissão não encontrada' }, { status: 404 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const pipelineSecret = process.env.PIPELINE_SECRET

  if (process.env.QSTASH_TOKEN) {
    const qstash = new QStash({ token: process.env.QSTASH_TOKEN })
    await qstash.publishJSON({
      url: `${appUrl}/api/pipeline`,
      body: { submission_id },
      headers: { 'x-pipeline-secret': pipelineSecret! },
      retries: 2,
    })
    log('info', 'reprocess.enqueued', { submissionId: submission_id, via: 'qstash' })
  } else {
    fetch(`${appUrl}/api/pipeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-pipeline-secret': pipelineSecret! },
      body: JSON.stringify({ submission_id }),
    }).catch((err) => log('error', 'reprocess.dispatch_failed', { submissionId: submission_id, error: String(err) }))
  }

  return NextResponse.redirect(new URL('/admin', req.url), { status: 303 })
}
