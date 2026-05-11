DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'email_import_status'
  ) THEN
    CREATE TYPE email_import_status AS ENUM (
      'pending_review',
      'imported',
      'failed',
      'ignored'
    );
  END IF;
END $$;

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_transactions_user_source_date
  ON transactions (user_id, source, date DESC);

CREATE TABLE IF NOT EXISTS gmail_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  google_email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  scopes TEXT NOT NULL,
  sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  gmail_history_id BIGINT NULL,
  sync_in_progress BOOLEAN NOT NULL DEFAULT FALSE,
  last_sync_started_at TIMESTAMPTZ NULL,
  last_synced_at TIMESTAMPTZ NULL,
  last_error TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_gmail_connections_google_email
  ON gmail_connections (LOWER(google_email));

CREATE INDEX IF NOT EXISTS idx_gmail_connections_sync
  ON gmail_connections (sync_enabled, sync_in_progress, last_synced_at);

CREATE TABLE IF NOT EXISTS bank_email_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT NOT NULL,
  sender_pattern TEXT NOT NULL,
  subject_pattern TEXT NOT NULL,
  amount_regex TEXT NOT NULL,
  merchant_regex TEXT NULL,
  date_regex TEXT NULL,
  card_regex TEXT NULL,
  transaction_type transaction_type NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_email_patterns_active
  ON bank_email_patterns (active, bank_name);

CREATE TABLE IF NOT EXISTS bank_account_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  card_last4 TEXT NOT NULL,
  minift_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, bank_name, card_last4)
);

CREATE INDEX IF NOT EXISTS idx_bank_account_mappings_account
  ON bank_account_mappings (minift_account_id);

CREATE TABLE IF NOT EXISTS email_transaction_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gmail_message_id TEXT NOT NULL,
  gmail_thread_id TEXT NULL,
  bank_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  email_subject TEXT NOT NULL,
  email_date TIMESTAMPTZ NOT NULL,
  parsed_successfully BOOLEAN NOT NULL DEFAULT FALSE,
  parsing_error TEXT NULL,
  raw_email_snippet TEXT NULL,
  parsed_transaction JSONB NULL,
  transaction_hash TEXT NULL,
  status email_import_status NOT NULL DEFAULT 'pending_review',
  matched_account_id UUID NULL REFERENCES accounts(id) ON DELETE SET NULL,
  created_transaction_id UUID NULL REFERENCES transactions(id) ON DELETE SET NULL,
  sync_attempt_count INTEGER NOT NULL DEFAULT 0,
  reviewed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (gmail_message_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_transaction_imports_hash
  ON email_transaction_imports (user_id, transaction_hash)
  WHERE transaction_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_transaction_imports_status
  ON email_transaction_imports (user_id, status, email_date DESC);

INSERT INTO bank_email_patterns (
  bank_name,
  sender_pattern,
  subject_pattern,
  amount_regex,
  merchant_regex,
  date_regex,
  card_regex,
  transaction_type
)
SELECT *
FROM (
  VALUES
    (
      'Banco Popular',
      '(?i)(popular|popularenlinea\\.com)',
      '(?i)(consumo|compra|retiro|tarjeta|alerta)',
      '(?i)(?:RD\\$|DOP|US\\$|USD)\\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\\.\\d{2})|[0-9]+(?:\\.\\d{2})?)',
      '(?i)(?:en|a)\\s+([A-Z0-9 .\\-*]{3,})',
      '(?i)(\\d{2}[/-]\\d{2}[/-]\\d{4}(?:\\s+\\d{1,2}:\\d{2}(?::\\d{2})?)?)',
      '(?i)(?:terminada|finaliza(?:da)?|ending)\\s*(?:en)?\\s*([0-9]{4})',
      'expense'::transaction_type
    ),
    (
      'Banreservas',
      '(?i)banreservas',
      '(?i)(consumo|compra|retiro|alerta)',
      '(?i)(?:RD\\$|DOP|US\\$|USD)\\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\\.\\d{2})|[0-9]+(?:\\.\\d{2})?)',
      '(?i)(?:en|a)\\s+([A-Z0-9 .\\-*]{3,})',
      '(?i)(\\d{2}[/-]\\d{2}[/-]\\d{4}(?:\\s+\\d{1,2}:\\d{2}(?::\\d{2})?)?)',
      '(?i)(?:tarjeta|tc)\\s*(?:\\*+)?([0-9]{4})',
      'expense'::transaction_type
    ),
    (
      'BHD',
      '(?i)\\bbhd\\b',
      '(?i)(compra|consumo|retiro|aprobada|aprobado)',
      '(?i)(?:RD\\$|DOP|US\\$|USD)\\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\\.\\d{2})|[0-9]+(?:\\.\\d{2})?)',
      '(?i)(?:en|a)\\s+([A-Z0-9 .\\-*]{3,})',
      '(?i)(\\d{2}[/-]\\d{2}[/-]\\d{4}(?:\\s+\\d{1,2}:\\d{2}(?::\\d{2})?)?)',
      '(?i)(?:tarjeta|ending)\\s*(?:\\*+)?([0-9]{4})',
      'expense'::transaction_type
    ),
    (
      'Qik',
      '(?i)\\bqik\\b',
      '(?i)(compra|consumo|retiro|transferencia)',
      '(?i)(?:RD\\$|DOP|US\\$|USD)\\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\\.\\d{2})|[0-9]+(?:\\.\\d{2})?)',
      '(?i)(?:en|a)\\s+([A-Z0-9 .\\-*]{3,})',
      '(?i)(\\d{2}[/-]\\d{2}[/-]\\d{4}(?:\\s+\\d{1,2}:\\d{2}(?::\\d{2})?)?)',
      '(?i)(?:tarjeta|ending)\\s*(?:\\*+)?([0-9]{4})',
      'expense'::transaction_type
    ),
    (
      'Scotiabank RD',
      '(?i)scotiabank',
      '(?i)(compra|consumo|retiro|alerta)',
      '(?i)(?:RD\\$|DOP|US\\$|USD)\\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\\.\\d{2})|[0-9]+(?:\\.\\d{2})?)',
      '(?i)(?:en|a)\\s+([A-Z0-9 .\\-*]{3,})',
      '(?i)(\\d{2}[/-]\\d{2}[/-]\\d{4}(?:\\s+\\d{1,2}:\\d{2}(?::\\d{2})?)?)',
      '(?i)(?:tarjeta|ending)\\s*(?:\\*+)?([0-9]{4})',
      'expense'::transaction_type
    ),
    (
      'APAP',
      '(?i)\\bapap\\b',
      '(?i)(compra|consumo|retiro|transferencia)',
      '(?i)(?:RD\\$|DOP|US\\$|USD)\\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\\.\\d{2})|[0-9]+(?:\\.\\d{2})?)',
      '(?i)(?:en|a)\\s+([A-Z0-9 .\\-*]{3,})',
      '(?i)(\\d{2}[/-]\\d{2}[/-]\\d{4}(?:\\s+\\d{1,2}:\\d{2}(?::\\d{2})?)?)',
      '(?i)(?:tarjeta|ending)\\s*(?:\\*+)?([0-9]{4})',
      'expense'::transaction_type
    ),
    (
      'Asociación Cibao',
      '(?i)(cibao|acibao)',
      '(?i)(compra|consumo|retiro|transferencia)',
      '(?i)(?:RD\\$|DOP|US\\$|USD)\\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\\.\\d{2})|[0-9]+(?:\\.\\d{2})?)',
      '(?i)(?:en|a)\\s+([A-Z0-9 .\\-*]{3,})',
      '(?i)(\\d{2}[/-]\\d{2}[/-]\\d{4}(?:\\s+\\d{1,2}:\\d{2}(?::\\d{2})?)?)',
      '(?i)(?:tarjeta|ending)\\s*(?:\\*+)?([0-9]{4})',
      'expense'::transaction_type
    ),
    (
      'Santa Cruz',
      '(?i)(santa ?cruz)',
      '(?i)(compra|consumo|retiro|transferencia)',
      '(?i)(?:RD\\$|DOP|US\\$|USD)\\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\\.\\d{2})|[0-9]+(?:\\.\\d{2})?)',
      '(?i)(?:en|a)\\s+([A-Z0-9 .\\-*]{3,})',
      '(?i)(\\d{2}[/-]\\d{2}[/-]\\d{4}(?:\\s+\\d{1,2}:\\d{2}(?::\\d{2})?)?)',
      '(?i)(?:tarjeta|ending)\\s*(?:\\*+)?([0-9]{4})',
      'expense'::transaction_type
    )
) AS seed (
  bank_name,
  sender_pattern,
  subject_pattern,
  amount_regex,
  merchant_regex,
  date_regex,
  card_regex,
  transaction_type
)
WHERE NOT EXISTS (
  SELECT 1
  FROM bank_email_patterns existing
  WHERE existing.bank_name = seed.bank_name
);
