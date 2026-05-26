"use client";

import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

  return (
    <Modal
      open={open}
      title={
        editingLabel
          ? t("transactions.recurringForm.editTitle")
          : t("transactions.recurringForm.addTitle")
      }
      subtitle={t("transactions.recurring.description")}
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
            <label htmlFor="recurring_account">
              {t("transactions.recurringForm.account")}
            </label>
            <Select
              id="recurring_account"
              value={form.account_id}
              onChange={(event) => onChange({ account_id: event.target.value })}
              required
            >
              <option value="">{t("common.selectAccount")}</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <label>{t("transactions.recurringForm.type")}</label>
            <SegmentedControl
              options={[
                {
                  label: t("transactions.recurringForm.expense"),
                  value: "expense",
                },
                {
                  label: t("transactions.recurringForm.income"),
                  value: "income",
                },
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
            <label htmlFor="recurring_amount">
              {t("transactions.recurringForm.amount")}
            </label>
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
            <label htmlFor="recurring_frequency">
              {t("transactions.recurringForm.frequency")}
            </label>
            <Select
              id="recurring_frequency"
              value={form.frequency}
              onChange={(event) =>
                onChange({
                  frequency: event.target.value as RecurringFormValues["frequency"],
                })
              }
            >
              <option value="daily">
                {t("transactions.recurring.frequency.daily")}
              </option>
              <option value="weekly">
                {t("transactions.recurring.frequency.weekly")}
              </option>
              <option value="monthly">
                {t("transactions.recurring.frequency.monthly")}
              </option>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="recurring_category">
              {t("transactions.recurringForm.category")}
            </label>
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
              placeholder={t("transactions.recurringForm.categoryPlaceholder")}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="next_run_date">
              {t("transactions.recurringForm.startDate")}
            </label>
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
          <label htmlFor="recurring_note">
            {t("transactions.recurringForm.note")}
          </label>
          <TextArea
            id="recurring_note"
            value={form.note}
            maxLength={TRANSACTION_NOTE_MAX_LENGTH}
            onChange={(event) =>
              onChange({
                note: event.target.value.slice(0, TRANSACTION_NOTE_MAX_LENGTH),
              })
            }
            placeholder={t("transactions.recurringForm.notePlaceholder")}
          />
        </div>

        <FormError
          error={error}
          fallbackMessage={t("transactions.recurringForm.errorFallbackAdd")}
        />

        <ModalActions>
          <Button
            className="flex-1 sm:flex-none"
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            {t("common.cancel")}
          </Button>
          <Button className="flex-1 sm:flex-none" type="submit">
            {isPending
              ? t("transactions.recurringForm.saving")
              : editingLabel
                ? t("transactions.recurringForm.save")
                : t("transactions.recurringForm.add")}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}
