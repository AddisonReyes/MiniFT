export type MoneyValue = string | number;
export type TransactionType = "income" | "expense" | "transfer";
export type AccountType =
  | "cash"
  | "bank_account"
  | "credit_card"
  | "loan";
export type RecurringFrequency = "daily" | "weekly" | "monthly";

export interface User {
  id: string;
  email: string;
  currency: string;
  created_at: string;
}

export interface AuthSessionResponse {
  user: User;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  created_at: string;
  balance: MoneyValue;
}

export interface ExchangeRate {
  from_currency: string;
  to_currency: string;
  rate: MoneyValue;
  is_manual: boolean;
  provider_rate?: MoneyValue | null;
}

export interface Transaction {
  id: string;
  account_id: string | null;
  account_name: string | null;
  account_currency: string | null;
  amount: MoneyValue;
  type: TransactionType;
  display_type: TransactionType;
  category: string;
  note: string | null;
  date: string;
  created_at: string;
  transfer_id: string | null;
}

export interface Transfer {
  id: string;
  from_account_id: string;
  to_account_id: string;
  from_account_name: string;
  to_account_name: string;
  amount: MoneyValue;
  date: string;
  note: string | null;
  created_at: string;
}

export interface Budget {
  id: string;
  category: string;
  limit_amount: MoneyValue;
  month: string;
  created_at: string;
  spent_amount: MoneyValue;
  remaining_amount: MoneyValue;
}

export interface RecurringTransaction {
  id: string;
  account_id: string;
  account_name: string;
  account_currency: string;
  amount: MoneyValue;
  type: Exclude<TransactionType, "transfer">;
  category: string;
  note: string | null;
  frequency: RecurringFrequency;
  next_run_date: string;
  created_at: string;
}

export interface MonthlySummary {
  month: string;
  income_total: MoneyValue;
  expense_total: MoneyValue;
  net_total: MoneyValue;
}

export interface CategorySummaryItem {
  category: string;
  total: MoneyValue;
  percentage: number;
}

export interface CategorySummary {
  month: string;
  type: Exclude<TransactionType, "transfer">;
  items: CategorySummaryItem[];
}

export interface ApiMessage {
  message: string;
  error?: string;
}
