"use client";

import { useTranslation } from "react-i18next";

import { FormError } from "@/components/form-error";
import {
  Button,
  Input,
  Modal,
  ModalActions,
  Select,
  TextArea,
} from "@/components/ui";
import type { Account } from "@/lib/types";
import {
  TRANSACTION_NOTE_MAX_LENGTH,
  type TransferFormValues,
} from "@/lib/transactions";

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
  const { t } = useTranslation();

  return (
    <Modal
      open={open}
      title={t("transactions.transfer.title")}
      subtitle={t("transactions.description")}
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
            <label htmlFor="from_account">{t("transactions.transfer.fromAccount")}</label>
            <Select
              id="from_account"
              value={form.from_account_id}
              onChange={(event) =>
                onChange({ from_account_id: event.target.value })
              }
              required
            >
              <option value="">{t("common.selectSourceAccount")}</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} · {account.currency}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="to_account">{t("transactions.transfer.toAccount")}</label>
            <Select
              id="to_account"
              value={form.to_account_id}
              onChange={(event) =>
                onChange({ to_account_id: event.target.value })
              }
              required
            >
              <option value="">{t("common.selectDestAccount")}</option>
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
            <label htmlFor="transfer_amount">{t("transactions.transfer.amount")}</label>
            <Input
              id="transfer_amount"
              inputMode="decimal"
              value={form.amount}
              onChange={(event) => onChange({ amount: event.target.value })}
              placeholder="100.00"
              required
            />
            <p className="text-xs text-mist">
              {t("transactions.transfer.fromAccount")}
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="transfer_date">{t("transactions.transfer.date")}</label>
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
          <label htmlFor="transfer_note">{t("transactions.transfer.note")}</label>
          <TextArea
            id="transfer_note"
            value={form.note}
            maxLength={TRANSACTION_NOTE_MAX_LENGTH}
            onChange={(event) =>
              onChange({
                note: event.target.value.slice(0, TRANSACTION_NOTE_MAX_LENGTH),
              })
            }
            placeholder={t("transactions.transfer.notePlaceholder")}
          />
        </div>

        <FormError error={error} fallbackMessage={t("transactions.transfer.errorFallbackAdd")} />

        <ModalActions>
          <Button className="flex-1 sm:flex-none" type="button" variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button className="flex-1 sm:flex-none" type="submit">
            {isPending ? t("transactions.transfer.adding") : t("transactions.transfer.add")}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}
