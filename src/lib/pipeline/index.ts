import { createServerClient } from '@/lib/supabase/server'
import { transcribeAudio } from '@/lib/openai/whisper'
import { generateResume } from '@/lib/openai/gpt'
import { generatePDF } from '@/lib/pdf/generator'
import { sendDeliveryEmail } from '@/lib/email/resend'
import { log } from '@/lib/logger'
import type { SubmissionData } from '@/types'

const MAX_RETRIES   = 2
const PIPELINE_MS   = 3 * 60 * 1000

export async function runPipeline(submissionId: string): Promise<void> {
  const supabase = createServerClient()

  const { data: submission } = await supabase
    .from('submissions')
    .select('*, submission_data(*)')
    .eq('id', submissionId)
    .single()

  if (!submission) throw new Error(`Submissão ${submissionId} não encontrada`)

  if (submission.retry_count >= MAX_RETRIES) {
    await markFailed(submissionId, 'Número máximo de tentativas atingido')
    return
  }

  const data: SubmissionData = submission.submission_data
  const t0 = Date.now()

  log('info', 'pipeline.start', { submissionId, attempt: submission.retry_count + 1 })

  try {
    await withTimeout(
      runPipelineCore(supabase, submissionId, data, submission.access_token),
      PIPELINE_MS
    )
    log('info', 'pipeline.completed', { submissionId, durationMs: Date.now() - t0 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    const newRetryCount = submission.retry_count + 1

    log('error', 'pipeline.failed', { submissionId, attempt: newRetryCount, error: message, durationMs: Date.now() - t0 })

    if (newRetryCount < MAX_RETRIES) {
      await supabase
        .from('submissions')
        .update({ retry_count: newRetryCount, error_message: message })
        .eq('id', submissionId)
      // Propaga o erro — QStash fará o retry da entrega automaticamente
      throw err
    }

    await markFailed(submissionId, message)
    // Não relança na última tentativa — marca como failed e encerra
  }
}

async function runPipelineCore(
  supabase: ReturnType<typeof createServerClient>,
  submissionId: string,
  data: SubmissionData,
  accessToken: string
): Promise<void> {
  // 1. Transcrição de áudios em paralelo (com fallback individual de 60s)
  log('info', 'pipeline.transcription.start', { submissionId })
  const experienciasTranscritas = await Promise.all(
    data.experiencias.map(async (exp) => {
      if (!exp.audio_url) return exp
      const transcricao = await withTimeout(transcribeAudio(exp.audio_url), 60_000, null)
      return { ...exp, transcricao }
    })
  )

  await supabase
    .from('submission_data')
    .update({ experiencias: experienciasTranscritas })
    .eq('submission_id', submissionId)

  log('info', 'pipeline.transcription.done', { submissionId })

  // 2. Buscar ajuste pendente (se houver — reprocessamento após feedback)
  const { data: pendingAdjustment } = await supabase
    .from('adjustments')
    .select('id, message')
    .eq('submission_id', submissionId)
    .is('resolved_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // 3. Gerar currículo com GPT-4o
  log('info', 'pipeline.gpt.start', { submissionId, hasAdjustment: !!pendingAdjustment })
  const resumeText = await withTimeout(
    generateResume(
      { ...data, experiencias: experienciasTranscritas },
      pendingAdjustment?.message ?? null
    ),
    90_000
  )
  log('info', 'pipeline.gpt.done', { submissionId })

  // 4. Validar estrutura do output
  validateResumeOutput(resumeText)

  // 5. Gerar PDF
  log('info', 'pipeline.pdf.start', { submissionId })
  const pdfBuffer = await withTimeout(generatePDF(resumeText), 30_000)
  log('info', 'pipeline.pdf.done', { submissionId })

  // 6. Upload PDF no Supabase Storage
  const pdfPath = `${submissionId}/curriculo.pdf`
  const { error: uploadError } = await supabase.storage
    .from('vertice-pdfs')
    .upload(pdfPath, pdfBuffer, { contentType: 'application/pdf', upsert: true })

  if (uploadError) throw new Error(`Falha no upload do PDF: ${uploadError.message}`)

  // 7. Marcar ajuste como resolvido (se havia um)
  if (pendingAdjustment) {
    await supabase
      .from('adjustments')
      .update({ resolved_at: new Date().toISOString(), resolved_by: 'pipeline' })
      .eq('id', pendingAdjustment.id)
  }

  // 8. Marcar como completed
  await supabase
    .from('submissions')
    .update({ status: 'completed', pdf_url: pdfPath, completed_at: new Date().toISOString() })
    .eq('id', submissionId)

  // 9. Enviar email de entrega
  await sendDeliveryEmail(accessToken)
}

function validateResumeOutput(text: string): void {
  const required = ['CABEÇALHO', 'CONTATO', 'PRAZER,', 'EXPERIÊNCIA']
  const missing = required.filter(s => !text.toUpperCase().includes(s.toUpperCase()))
  if (missing.length > 0) throw new Error(`Output do GPT sem seções obrigatórias: ${missing.join(', ')}`)
  if (text.length < 500) throw new Error('Output do GPT muito curto — possível recusa ou erro do modelo')
}

async function markFailed(submissionId: string, message: string) {
  const supabase = createServerClient()
  await supabase
    .from('submissions')
    .update({ status: 'failed', error_message: message })
    .eq('id', submissionId)
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T>
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T>
function withTimeout<T>(promise: Promise<T>, ms: number, fallback?: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve, reject) =>
      setTimeout(
        () => fallback !== undefined ? resolve(fallback) : reject(new Error(`Timeout após ${ms}ms`)),
        ms
      )
    ),
  ])
}
