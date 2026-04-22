import OpenAI from 'openai'
import { SYSTEM_PROMPT, buildGPTPayload } from './prompts'
import type { SubmissionData } from '@/types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function generateResume(data: SubmissionData, adjustment: string | null = null): Promise<string> {
  const payload = buildGPTPayload(data, adjustment)

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: payload },
    ],
    temperature: 0.3,
    max_tokens: 8000,
  })

  const choice = response.choices[0]
  if (!choice?.message?.content) throw new Error('GPT retornou resposta vazia')
  if (choice.finish_reason === 'length') throw new Error('Currículo truncado pelo modelo — max_tokens atingido')

  return choice.message.content
}
