"use client";

import { useTranslation } from "react-i18next";

import { DEFAULT_CATEGORIES } from "@/lib/constants";
import type { Transaction } from "@/lib/types";
import type {
  NonTransferTransactionType,
  TransactionFormValues,
} from "@/lib/transactions";
import {
  TRANSACTION_CATEGORY_MAX_LENGTH,
  TRANSACTION_NOTE_MAX_LENGTH,
} from "@/lib/transactions";
import type { Account } from "@/lib/types";
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
  const { t } = useTranslation();

  return (
    <Modal
      open={open}
      title={editingTransaction ? t("transactions.form.editTitle") : t("transactions.form.addTitle", { type: t("transactions.form.income") })}
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
            <label>{t("transactions.form.type")}</label>
            <SegmentedControl
              options={[
                { label: t("transactions.form.expense"), value: "expense" },
                { label: t("transactions.form.income"), value: "income" },
              ]}
              value={form.type}
              onChange={(value) =>
                onChange({
                  type: value as NonTransferTransactionType,
                })
              }
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="transaction_account">{t("transactions.form.account")}</label>
            <Select
              id="transaction_account"
              value={form.account_id}
              onChange={(event) => onChange({ account_id: event.target.value })}
            >
              <option value="">{t("common.cash")}</option>
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
            <label htmlFor="transaction_amount">{t("transactions.form.amount")}</label>
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
            <label htmlFor="transaction_date">{t("transactions.form.date")}</label>
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
          <label htmlFor="transaction_category">{t("transactions.form.category")}</label>
          <Input
            id="transaction_category"
            list="category-suggestions"
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
            placeholder={t("transactions.form.categoryPlaceholder")}
            required
          />
          <datalist id="category-suggestions">
            {DEFAULT_CATEGORIES.map((category) => (
              <option
                key={category}
                value={t(`categories.${category}`, { defaultValue: category })}
              />
            ))}
          </datalist>
        </div>

        <div className="space-y-2">
          <label htmlFor="transaction_note">{t("transactions.form.note")}</label>
          <TextArea
            id="transaction_note"
            value={form.note}
            maxLength={TRANSACTION_NOTE_MAX_LENGTH}
            onChange={(event) =>
              onChange({
                note: event.target.value.slice(0, TRANSACTION_NOTE_MAX_LENGTH),
              })
            }
            placeholder={t("transactions.form.notePlaceholder")}
          />
        </div>

        <FormError error={error} fallbackMessage={t("transactions.form.errorFallbackAdd")} />

        <ModalActions>
          <Button className="flex-1 sm:flex-none" type="button" variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button className="flex-1 sm:flex-none" type="submit">
            {isPending
              ? t("transactions.form.saving")
              : editingTransaction
                ? t("transactions.form.save")
                : t("transactions.form.add")}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}
