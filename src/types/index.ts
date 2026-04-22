export type SubmissionStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface Submission {
  id: string
  access_token: string
  customer_email: string | null
  user_id: string | null
  payment_id: string | null
  status: SubmissionStatus
  created_at: string
  submitted_at: string | null
  completed_at: string | null
  pdf_url: string | null
  error_message: string | null
  retry_count: number
}

export interface Experience {
  cargo: string
  empresa: string
  periodo_inicio: string
  periodo_fim: string
  atual: boolean
  local: string
  tipo: string
  responsabilidades: string
  impactos: string
  facilidades: string[]
  rotina: string[]
  audio_url: string | null
  transcricao: string | null
}

export interface SubmissionData {
  id: string
  submission_id: string
  nome_completo: string
  cargo_alvo: string
  cidade: string | null
  estado: string | null
  trajetoria: string[]
  diferenciais: string[]
  soft_skills: string[]
  hard_skills: string[]
  objetivo_profissional: string | null
  experiencias: Experience[]
}

export interface Adjustment {
  id: string
  submission_id: string
  message: string
  created_at: string
  resolved_at: string | null
  resolved_by: string | null
}
