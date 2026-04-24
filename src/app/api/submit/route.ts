import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Client as QStash } from '@upstash/qstash'
import { createServerClient } from '@/lib/supabase/server'
import { submitLimiter, getIp } from '@/lib/ratelimit'
import { log } from '@/lib/logger'

const experienceSchema = z.object({
  cargo:             z.string().max(200).default(''),
  empresa:           z.string().max(200).default(''),
  periodo_inicio:    z.string().max(50).default(''),
  periodo_fim:       z.string().max(50).default(''),
  atual:             z.boolean().default(false),
  local:             z.string().max(50).default(''),
  tipo:              z.string().max(50).default(''),
  responsabilidades: z.string().max(3000).default(''),
  impactos:          z.string().max(3000).default(''),
  facilidades:       z.array(z.string().max(100)).default([]),
  rotina:            z.array(z.string().max(100)).default([]),
})

const schema = z.object({
  access_token:          z.string().min(1).max(64),
  nome_completo:         z.string().min(1).max(200),
  cargo_alvo:            z.string().min(1).max(200),
  cidade:                z.string().max(100).nullish(),
  estado:                z.string().max(100).nullish(),
  objetivo_profissional: z.string().max(2000).nullish(),
  trajetoria:            z.array(z.string().max(100)).default([]),
  diferenciais:          z.array(z.string().max(100)).default([]),
  soft_skills:           z.array(z.string().max(100)).default([]),
  hard_skills:           z.array(z.string().max(100)).default([]),
  experiencias:          z.array(experienceSchema).min(1).max(3),
})

function safeJsonParse(val: FormDataEntryValue | null, fallback: unknown = []) {
  if (!val || typeof val !== 'string') return fallback
  try { return JSON.parse(val) } catch { return fallback }
}

export async function POST(req: NextRequest) {
  const ip = getIp(req)

  if (submitLimiter) {
    const { success } = await submitLimiter.limit(ip)
    if (!success) {
      log('warn', 'submit.rate_limited', { ip })
      return NextResponse.json({ error: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 })
    }
  }

  const supabase = createServerClient()
  const formData = await req.formData()

  const raw = {
    access_token:          formData.get('access_token'),
    nome_completo:         formData.get('nome_completo'),
    cargo_alvo:            formData.get('cargo_alvo'),
    cidade:                formData.get('cidade'),
    estado:                formData.get('estado'),
    objetivo_profissional: formData.get('objetivo_profissional'),
    trajetoria:            safeJsonParse(formData.get('trajetoria')),
    diferenciais:          safeJsonParse(formData.get('diferenciais')),
    soft_skills:           safeJsonParse(formData.get('soft_skills')),
    hard_skills:           safeJsonParse(formData.get('hard_skills')),
    experiencias:          safeJsonParse(formData.get('experiencias')),
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { access_token, experiencias, ...rest } = parsed.data

  // UPDATE atômico — previne race condition de duplo-submit
  const { data: submission, error: updateError } = await supabase
    .from('submissions')
    .update({ status: 'processing', submitted_at: new Date().toISOString() })
    .eq('access_token', access_token)
    .eq('status', 'pending')
    .select('id')
    .single()

  if (updateError || !submission) {
    return NextResponse.json(
      { error: 'Token inválido ou formulário já enviado' },
      { status: 409 }
    )
  }

  log('info', 'submit.received', { submissionId: submission.id })

  // Upload de áudios em paralelo
  const experienciasComAudio = await Promise.all(
    experiencias.map(async (exp, i) => {
      const audioFile = formData.get(`audio_${i + 1}`) as File | null
      let audio_url: string | null = null

      if (audioFile && audioFile.size > 0) {
        const path = `${submission.id}/experiencia-${i + 1}.webm`
        const buffer = Buffer.from(await audioFile.arrayBuffer())
        const { error: uploadError } = await supabase.storage
          .from('vertice-audios')
          .upload(path, buffer, { contentType: 'audio/webm', upsert: true })
        if (!uploadError) audio_url = path
        else log('warn', 'submit.audio_upload_failed', { submissionId: submission.id, index: i + 1, error: uploadError.message })
      }

      return { ...exp, audio_url, transcricao: null }
    })
  )

  const { error: insertError } = await supabase
    .from('submission_data')
    .insert({ submission_id: submission.id, ...rest, experiencias: experienciasComAudio })

  if (insertError) {
    await supabase
      .from('submissions')
      .update({ status: 'pending', submitted_at: null })
      .eq('id', submission.id)
    log('error', 'submit.insert_failed', { submissionId: submission.id, error: insertError.message })
    return NextResponse.json({ error: 'Erro ao salvar dados' }, { status: 500 })
  }

  // Enfileirar pipeline via QStash — entrega garantida com retry automático
  await enqueuePipeline(submission.id)

  return NextResponse.json({ ok: true })
}

async function enqueuePipeline(submissionId: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const pipelineSecret = process.env.PIPELINE_SECRET

  if (process.env.QSTASH_TOKEN) {
    const qstash = new QStash({ token: process.env.QSTASH_TOKEN })
    await qstash.publishJSON({
      url: `${appUrl}/api/pipeline`,
      body: { submission_id: submissionId },
      headers: { 'x-pipeline-secret': pipelineSecret! },
      retries: 2,
    })
    log('info', 'submit.pipeline_enqueued', { submissionId, via: 'qstash' })
  } else {
    // Fallback para desenvolvimento sem QStash configurado
    fetch(`${appUrl}/api/pipeline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pipeline-secret': pipelineSecret!,
      },
      body: JSON.stringify({ submission_id: submissionId }),
    }).catch((err) => log('error', 'submit.pipeline_dispatch_failed', { submissionId, error: String(err) }))
    log('info', 'submit.pipeline_enqueued', { submissionId, via: 'fetch' })
  }
}
