ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS currency TEXT;

UPDATE accounts AS accounts_table
SET currency = UPPER(TRIM(users.currency))
FROM users
WHERE accounts_table.user_id = users.id
  AND (
    accounts_table.currency IS NULL
    OR TRIM(accounts_table.currency) = ''
  );

UPDATE accounts
SET currency = 'USD'
WHERE currency IS NULL OR TRIM(currency) = '';

ALTER TABLE accounts
  ALTER COLUMN currency SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type_v2') THEN
    CREATE TYPE account_type_v2 AS ENUM ('cash', 'bank_account', 'credit_card', 'loan');
  END IF;
END $$;

ALTER TABLE accounts
  ALTER COLUMN type TYPE account_type_v2
  USING (
    CASE type::text
      WHEN 'bank' THEN 'bank_account'
      ELSE type::text
    END
  )::account_type_v2;

DROP TYPE IF EXISTS account_type;

ALTER TYPE account_type_v2 RENAME TO account_type;

CREATE TABLE IF NOT EXISTS exchange_rates (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate NUMERIC(18, 8) NOT NULL CHECK (rate > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, from_currency, to_currency),
  CHECK (from_currency <> to_currency)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_user_id
  ON exchange_rates (user_id);
