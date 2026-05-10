"use client";

import { FormError } from "@/components/form-error";
import {
  Button,
  Input,
  Modal,
  ModalActions,
  SegmentedControl,
  Select,
  TextArea,
} from "@/components/ui";
import type { Account } from "@/lib/types";
import type {
  NonTransferTransactionType,
  RecurringFormValues,
} from "@/lib/transactions";
import {
  TRANSACTION_CATEGORY_MAX_LENGTH,
  TRANSACTION_NOTE_MAX_LENGTH,
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
            <label>Type</label>
            <SegmentedControl
              options={[
                { label: "Expense", value: "expense" },
                { label: "Income", value: "income" },
              ]}
              value={form.type}
              onChange={(value) =>
                onChange({
                  type: value as NonTransferTransactionType,
                })
              }
            />
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
            maxLength={TRANSACTION_CATEGORY_MAX_LENGTH}
            onChange={(event) =>
              onChange({
                category: event.target.value.slice(
                  0,
                  TRANSACTION_CATEGORY_MAX_LENGTH,
                ),
              })
            }
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
            maxLength={TRANSACTION_NOTE_MAX_LENGTH}
            onChange={(event) =>
              onChange({
                note: event.target.value.slice(0, TRANSACTION_NOTE_MAX_LENGTH),
              })
            }
            placeholder="Optional context"
          />
        </div>

        <FormError
          error={error}
          fallbackMessage="Unable to save recurring transaction"
        />

        <ModalActions>
          <Button className="flex-1 sm:flex-none" type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1 sm:flex-none" type="submit">
            {isPending
              ? "Saving..."
              : editingLabel
                ? "Save changes"
                : "Create recurring"}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}
