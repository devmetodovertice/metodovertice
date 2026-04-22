-- ENUM de status
CREATE TYPE submission_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Tabela principal de submissões
CREATE TABLE submissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token      TEXT UNIQUE NOT NULL,
  stripe_session_id TEXT,
  customer_email    TEXT,
  status            submission_status NOT NULL DEFAULT 'pending',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at      TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  pdf_url           TEXT,
  error_message     TEXT,
  retry_count       INT NOT NULL DEFAULT 0
);

-- Dados do formulário
CREATE TABLE submission_data (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id         UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  nome_completo         TEXT NOT NULL,
  cargo_alvo            TEXT NOT NULL,
  cidade                TEXT,
  estado                TEXT,
  trajetoria            TEXT[] DEFAULT '{}',
  diferenciais          TEXT[] DEFAULT '{}',
  soft_skills           TEXT[] DEFAULT '{}',
  hard_skills           TEXT[] DEFAULT '{}',
  objetivo_profissional TEXT,
  experiencias          JSONB NOT NULL DEFAULT '[]',
  UNIQUE(submission_id)
);

-- Ajustes solicitados pelo usuário
CREATE TABLE adjustments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  message       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at   TIMESTAMPTZ,
  resolved_by   TEXT
);

-- Indexes
CREATE INDEX idx_submissions_access_token ON submissions(access_token);
CREATE INDEX idx_submissions_status       ON submissions(status);
CREATE INDEX idx_submission_data_sid      ON submission_data(submission_id);
CREATE INDEX idx_adjustments_sid          ON adjustments(submission_id);

-- RLS habilitado — acesso exclusivo via service_role (server-side)
ALTER TABLE submissions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE adjustments     ENABLE ROW LEVEL SECURITY;
