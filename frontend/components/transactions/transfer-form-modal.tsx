"use client";

import { FormError } from "@/components/form-error";
import { Button, Input, Modal, Select, TextArea } from "@/components/ui";
import type { Account } from "@/lib/types";
import type { TransferFormValues } from "@/lib/transactions";

export function TransferFormModal({
  open,
  form,
  accounts,
  isPending,
  error,
  onChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  form: TransferFormValues;
  accounts: Account[];
  isPending: boolean;
  error: unknown;
  onChange: (patch: Partial<TransferFormValues>) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Modal
      open={open}
      title="New transfer"
      subtitle="Transfers create mirrored entries so account balances stay in sync, and cross-currency moves convert automatically into the destination account currency."
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
            <label htmlFor="from_account">From Account</label>
            <Select
              id="from_account"
              value={form.from_account_id}
              onChange={(event) =>
                onChange({ from_account_id: event.target.value })
              }
              required
            >
              <option value="">Select source account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} · {account.currency}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="to_account">To Account</label>
            <Select
              id="to_account"
              value={form.to_account_id}
              onChange={(event) =>
                onChange({ to_account_id: event.target.value })
              }
              required
            >
              <option value="">Select destination account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} · {account.currency}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="transfer_amount">Amount</label>
            <Input
              id="transfer_amount"
              inputMode="decimal"
              value={form.amount}
              onChange={(event) => onChange({ amount: event.target.value })}
              placeholder="100.00"
              required
            />
            <p className="text-xs text-mist">
              Entered in the source account currency.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="transfer_date">Date</label>
            <Input
              id="transfer_date"
              type="date"
              value={form.date}
              onChange={(event) => onChange({ date: event.target.value })}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="transfer_note">Note</label>
          <TextArea
            id="transfer_note"
            value={form.note}
            onChange={(event) => onChange({ note: event.target.value })}
            placeholder="Optional transfer note"
          />
        </div>

        <FormError error={error} fallbackMessage="Unable to create transfer" />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {isPending ? "Creating..." : "Create transfer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
