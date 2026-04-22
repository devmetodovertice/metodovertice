-- Vincula submissões a usuários autenticados
ALTER TABLE submissions
  ADD COLUMN user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN payment_id TEXT UNIQUE;  -- idempotência de webhook

CREATE INDEX idx_submissions_user_id    ON submissions(user_id);
CREATE INDEX idx_submissions_payment_id ON submissions(payment_id);
