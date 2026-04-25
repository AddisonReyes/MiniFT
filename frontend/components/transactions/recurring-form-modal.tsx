"use client";

import { FormError } from "@/components/form-error";
import { Button, Input, Modal, Select, TextArea } from "@/components/ui";
import type { Account } from "@/lib/types";
import type {
  NonTransferTransactionType,
  RecurringFormValues,
} from "@/lib/transactions";

export function RecurringFormModal({
  open,
  editingLabel,
  form,
  accounts,
  isPending,
  error,
  onChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editingLabel?: string;
  form: RecurringFormValues;
  accounts: Account[];
  isPending: boolean;
  error: unknown;
  onChange: (patch: Partial<RecurringFormValues>) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Modal
      open={open}
      title={
        editingLabel
          ? "Edit recurring transaction"
          : "New recurring transaction"
      }
      subtitle="Recurring items generate real transactions when their schedule is due."
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
            <label htmlFor="recurring_account">Account</label>
            <Select
              id="recurring_account"
              value={form.account_id}
              onChange={(event) => onChange({ account_id: event.target.value })}
              required
            >
              <option value="">Select account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="recurring_type">Type</label>
            <Select
              id="recurring_type"
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
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="recurring_amount">Amount</label>
            <Input
              id="recurring_amount"
              inputMode="decimal"
              value={form.amount}
              onChange={(event) => onChange({ amount: event.target.value })}
              placeholder="85.00"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="recurring_frequency">Frequency</label>
            <Select
              id="recurring_frequency"
              value={form.frequency}
              onChange={(event) =>
                onChange({
                  frequency: event.target
                    .value as RecurringFormValues["frequency"],
                })
              }
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="recurring_category">Category</label>
            <Input
              id="recurring_category"
              value={form.category}
              onChange={(event) => onChange({ category: event.target.value })}
              placeholder="Rent"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="next_run_date">Next Run Date</label>
            <Input
              id="next_run_date"
              type="date"
              value={form.next_run_date}
              onChange={(event) =>
                onChange({ next_run_date: event.target.value })
              }
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="recurring_note">Note</label>
          <TextArea
            id="recurring_note"
            value={form.note}
            onChange={(event) => onChange({ note: event.target.value })}
            placeholder="Optional context"
          />
        </div>

        <FormError
          error={error}
          fallbackMessage="Unable to save recurring transaction"
        />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {isPending
              ? "Saving..."
              : editingLabel
                ? "Save changes"
                : "Create recurring"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
