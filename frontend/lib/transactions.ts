import type {
  RecurringFrequency,
  RecurringTransaction,
  Transaction,
  TransactionType,
} from "@/lib/types";

export type NonTransferTransactionType = Exclude<TransactionType, "transfer">;

export interface TransactionFiltersState {
  type: string;
  category: string;
  account_id: string;
  start_date: string;
  end_date: string;
}

export interface TransactionFormValues {
  account_id: string;
  amount: string;
  type: NonTransferTransactionType;
  category: string;
  note: string;
  date: string;
}

export interface TransferFormValues {
  from_account_id: string;
  to_account_id: string;
  amount: string;
  note: string;
  date: string;
}

export interface RecurringFormValues {
  account_id: string;
  amount: string;
  type: NonTransferTransactionType;
  category: string;
  note: string;
  frequency: RecurringFrequency;
  next_run_date: string;
}

export const today = new Date().toISOString().slice(0, 10);

export function createTransactionFilters(): TransactionFiltersState {
  return {
    type: "",
    category: "",
    account_id: "",
    start_date: "",
    end_date: "",
  };
}

export function createTransactionForm(
  type: NonTransferTransactionType = "expense",
): TransactionFormValues {
  return {
    account_id: "",
    amount: "",
    type,
    category: "",
    note: "",
    date: today,
  };
}

export function createTransferForm(): TransferFormValues {
  return {
    from_account_id: "",
    to_account_id: "",
    amount: "",
    note: "",
    date: today,
  };
}

export function createRecurringForm(): RecurringFormValues {
  return {
    account_id: "",
    amount: "",
    type: "expense",
    category: "",
    note: "",
    frequency: "monthly",
    next_run_date: today,
  };
}

export function transactionToFormValues(
  transaction: Transaction,
): TransactionFormValues {
  return {
    account_id: transaction.account_id ?? "",
    amount: String(transaction.amount),
    type: transaction.type as NonTransferTransactionType,
    category: transaction.category,
    note: transaction.note ?? "",
    date: transaction.date,
  };
}

export function recurringToFormValues(
  recurringTransaction: RecurringTransaction,
): RecurringFormValues {
  return {
    account_id: recurringTransaction.account_id,
    amount: String(recurringTransaction.amount),
    type: recurringTransaction.type,
    category: recurringTransaction.category,
    note: recurringTransaction.note ?? "",
    frequency: recurringTransaction.frequency,
    next_run_date: recurringTransaction.next_run_date,
  };
}

export function createTransactionQueryPath(
  filters: TransactionFiltersState,
): string {
  const params = new URLSearchParams();

  if (filters.type) {
    params.set("type", filters.type);
  }

  if (filters.category) {
    params.set("category", filters.category);
  }

  if (filters.account_id) {
    params.set("account_id", filters.account_id);
  }

  if (filters.start_date) {
    params.set("start_date", filters.start_date);
  }

  if (filters.end_date) {
    params.set("end_date", filters.end_date);
  }

  const query = params.toString();
  return query ? `/transactions?${query}` : "/transactions";
}
