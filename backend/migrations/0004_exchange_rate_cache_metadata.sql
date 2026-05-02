ALTER TABLE exchange_rates
  ADD COLUMN IF NOT EXISTS source TEXT;

UPDATE exchange_rates
SET source = 'manual'
WHERE source IS NULL OR TRIM(source) = '';

ALTER TABLE exchange_rates
  ALTER COLUMN source SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'exchange_rates_source_check'
  ) THEN
    ALTER TABLE exchange_rates
      ADD CONSTRAINT exchange_rates_source_check
      CHECK (source IN ('manual', 'provider'));
  END IF;
END $$;

ALTER TABLE exchange_rates
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE exchange_rates
SET updated_at = COALESCE(created_at, NOW())
WHERE updated_at IS NULL;

ALTER TABLE exchange_rates
  ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE exchange_rates
  DROP CONSTRAINT IF EXISTS exchange_rates_pkey;

ALTER TABLE exchange_rates
  ADD PRIMARY KEY (user_id, from_currency, to_currency, source);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_lookup
  ON exchange_rates (user_id, from_currency, to_currency);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_provider_updated
  ON exchange_rates (user_id, updated_at DESC)
  WHERE source = 'provider';
