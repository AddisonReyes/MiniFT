CREATE INDEX IF NOT EXISTS idx_accounts_user_type_created
  ON accounts (user_id, type, created_at);

CREATE INDEX IF NOT EXISTS idx_transactions_user_account_date
  ON transactions (user_id, account_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_non_transfer_summary
  ON transactions (user_id, date DESC, type)
  WHERE transfer_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_transfers_user_account_pair_date
  ON transfers (user_id, from_account_id, to_account_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_recurring_user_account_id
  ON recurring_transactions (user_id, account_id);
