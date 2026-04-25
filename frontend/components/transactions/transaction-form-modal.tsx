"use client";

import { DEFAULT_CATEGORIES } from "@/lib/constants";
import type { Transaction } from "@/lib/types";
import type {
  NonTransferTransactionType,
  TransactionFormValues,
} from "@/lib/transactions";
import type { Account } from "@/lib/types";
import { FormError } from "@/components/form-error";
import { Button, Input, Modal, Select, TextArea } from "@/components/ui";

export function TransactionFormModal({
  open,
  editingTransaction,
  form,
  accounts,
  isPending,
  error,
  onChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editingTransaction: Transaction | null;
  form: TransactionFormValues;
  accounts: Account[];
  isPending: boolean;
  error: unknown;
  onChange: (patch: Partial<TransactionFormValues>) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Modal
      open={open}
      title={editingTransaction ? "Edit transaction" : "New transaction"}
      subtitle="Regular transactions affect a single account."
      onClose={onClose}
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="transaction_type">Type</label>
            <Select
              id="transaction_type"
              value={form.type}
              onChange={(event) =>
                onChange({
                  type: event.target.value as NonTransferTransactionType,
                })
              }
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="transaction_account">Account</label>
            <Select
              id="transaction_account"
              value={form.account_id}
              onChange={(event) => onChange({ account_id: event.target.value })}
            >
              <option value="">Default cash account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="transaction_amount">Amount</label>
            <Input
              id="transaction_amount"
              inputMode="decimal"
              value={form.amount}
              onChange={(event) => onChange({ amount: event.target.value })}
              placeholder="100.00"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="transaction_date">Date</label>
            <Input
              id="transaction_date"
              type="date"
              value={form.date}
              onChange={(event) => onChange({ date: event.target.value })}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="transaction_category">Category</label>
          <Input
            id="transaction_category"
            list="category-suggestions"
            value={form.category}
            onChange={(event) => onChange({ category: event.target.value })}
            placeholder="Groceries"
            required
          />
          <datalist id="category-suggestions">
            {DEFAULT_CATEGORIES.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </div>

        <div className="space-y-2">
          <label htmlFor="transaction_note">Note</label>
          <TextArea
            id="transaction_note"
            value={form.note}
            onChange={(event) => onChange({ note: event.target.value })}
            placeholder="Optional context"
          />
        </div>

        <FormError error={error} fallbackMessage="Unable to save transaction" />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {isPending
              ? "Saving..."
              : editingTransaction
                ? "Save changes"
                : "Create transaction"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
