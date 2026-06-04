CREATE TABLE IF NOT EXISTS auth_login_attempts (
  email TEXT PRIMARY KEY,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  last_failed_at TIMESTAMPTZ NULL,
  locked_until TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE auth_login_attempts
  DROP CONSTRAINT IF EXISTS auth_login_attempts_failed_attempts_check,
  ADD CONSTRAINT auth_login_attempts_failed_attempts_check
    CHECK (failed_attempts >= 0);

CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_locked_until
  ON auth_login_attempts (locked_until);
