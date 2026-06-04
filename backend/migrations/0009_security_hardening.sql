ALTER TABLE email_challenges
  ADD COLUMN IF NOT EXISTS failed_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 5;

ALTER TABLE email_challenges
  DROP CONSTRAINT IF EXISTS email_challenges_failed_attempts_check,
  ADD CONSTRAINT email_challenges_failed_attempts_check
    CHECK (failed_attempts >= 0);

ALTER TABLE email_challenges
  DROP CONSTRAINT IF EXISTS email_challenges_max_attempts_check,
  ADD CONSTRAINT email_challenges_max_attempts_check
    CHECK (max_attempts > 0);

ALTER TABLE email_transaction_imports
  DROP CONSTRAINT IF EXISTS email_transaction_imports_gmail_message_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_transaction_imports_user_gmail_message
  ON email_transaction_imports (user_id, gmail_message_id);
