ALTER TABLE gmail_connections
  ADD COLUMN IF NOT EXISTS auto_approve_ready_imports BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE email_transaction_imports
  ADD COLUMN IF NOT EXISTS suggested_category TEXT NULL,
  ADD COLUMN IF NOT EXISTS confidence_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ready_to_approve BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS account_match_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS category_match_reason TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_email_transaction_imports_ready
  ON email_transaction_imports (user_id, status, ready_to_approve, confidence_score DESC, email_date DESC);

CREATE TABLE IF NOT EXISTS merchant_alias_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_merchant_key TEXT NOT NULL,
  source_merchant_label TEXT NOT NULL,
  normalized_merchant TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, source_merchant_key)
);

CREATE INDEX IF NOT EXISTS idx_merchant_alias_rules_user_key
  ON merchant_alias_rules (user_id, source_merchant_key);

CREATE TABLE IF NOT EXISTS merchant_category_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  merchant_key TEXT NOT NULL,
  merchant_name TEXT NOT NULL,
  transaction_type transaction_type NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, merchant_key, transaction_type)
);

CREATE INDEX IF NOT EXISTS idx_merchant_category_rules_lookup
  ON merchant_category_rules (user_id, merchant_key, transaction_type);

CREATE TABLE IF NOT EXISTS bank_default_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  currency TEXT NOT NULL,
  minift_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, bank_name, currency)
);

CREATE INDEX IF NOT EXISTS idx_bank_default_accounts_lookup
  ON bank_default_accounts (user_id, bank_name, currency);
