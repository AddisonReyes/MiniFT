CREATE TABLE IF NOT EXISTS refresh_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ NULL,
  replaced_by_session_id UUID NULL REFERENCES refresh_sessions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_refresh_sessions_user_id
  ON refresh_sessions (user_id);

CREATE INDEX IF NOT EXISTS idx_refresh_sessions_expires_at
  ON refresh_sessions (expires_at);

CREATE INDEX IF NOT EXISTS idx_refresh_sessions_active
  ON refresh_sessions (user_id, revoked_at, expires_at);
