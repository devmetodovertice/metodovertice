import OpenAI from 'openai'
import { createServerClient } from '@/lib/supabase/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function transcribeAudio(storagePath: string): Promise<string | null> {
  const supabase = createServerClient()

  const { data, error } = await supabase.storage
    .from('vertice-audios')
    .download(storagePath)

  if (error || !data) return null

  const buffer = Buffer.from(await data.arrayBuffer())
  const file = new File([buffer], 'audio.webm', { type: 'audio/webm' })

  const response = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language: 'pt',
  })

  return response.text
}
