DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'email_challenge_purpose'
  ) THEN
    CREATE TYPE email_challenge_purpose AS ENUM (
      'verify_email',
      'password_reset',
      'password_change'
    );
  END IF;
END $$;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ NULL;

UPDATE users
SET email_verified_at = COALESCE(email_verified_at, created_at)
WHERE email_verified_at IS NULL;

CREATE TABLE IF NOT EXISTS email_challenges (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose email_challenge_purpose NOT NULL,
  secret_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ NULL,
  revoked_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_email_challenges_user_purpose_active
  ON email_challenges (user_id, purpose, revoked_at, used_at, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_challenges_expires_at
  ON email_challenges (expires_at);
