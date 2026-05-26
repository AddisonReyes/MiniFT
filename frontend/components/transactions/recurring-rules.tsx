"use client";

import { useTranslation } from "react-i18next";

import { Badge, Button, Card } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import type { RecurringTransaction } from "@/lib/types";

export function RecurringRulesSection({
  recurringTransactions,
  currency,
  isLoading,
  errorMessage,
  onEdit,
  onDelete,
}: {
  recurringTransactions: RecurringTransaction[];
  currency: string;
  isLoading: boolean;
  errorMessage?: string;
  onEdit: (recurringTransaction: RecurringTransaction) => void;
  onDelete: (recurringTransaction: RecurringTransaction) => void;
}) {
  const { t } = useTranslation();

  return (
    <Card className="mt-6 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">{t("transactions.recurring.title")}</h2>
          <p className="mt-1 text-sm text-mist">
            {t("transactions.recurring.description")}
          </p>
        </div>
        <Badge tone="neutral">{t("transactions.list.shown", { count: recurringTransactions.length })}</Badge>
      </div>

      {isLoading ? (
        <div className="empty-state">
          <div className="font-medium text-white">{t("common.loading")}</div>
        </div>
      ) : errorMessage ? (
        <div className="rounded-[24px] border border-hazard/20 bg-hazard/10 px-4 py-6 text-sm text-hazard">
          {errorMessage}
        </div>
      ) : recurringTransactions.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {recurringTransactions.map((recurringTransaction) => (
            <div
              key={recurringTransaction.id}
              className="rounded-[20px] border border-white/10 bg-white/[0.03] p-5 transition hover:bg-white/[0.045]"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <div className="break-all font-medium text-white">
                    {recurringTransaction.category}
                  </div>
                  <div className="mt-1 text-sm text-mist">
                    {recurringTransaction.type} · {recurringTransaction.account_name}
                  </div>
                </div>
                <Badge
                  tone={
                    recurringTransaction.type === "income"
                      ? "success"
                      : "danger"
                  }
                >
                  {t(`transactions.recurring.frequency.${recurringTransaction.frequency}`) || recurringTransaction.frequency}
                </Badge>
              </div>

              <div className="mt-4 space-y-2 text-sm text-mist">
                <div>
                  {t("transactions.list.amount")}:{" "}
                  {formatCurrency(
                    recurringTransaction.amount,
                    recurringTransaction.account_currency || currency,
                  )}
                </div>
                <div>
                  {t("transactions.recurringForm.startDate")}: {formatDate(recurringTransaction.next_run_date)}
                </div>
                {recurringTransaction.note ? (
                  <div className="break-all">
                    {t("transactions.form.note")}: {recurringTransaction.note}
                  </div>
                ) : null}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Button
                  className="flex-1"
                  variant="secondary"
                  onClick={() => onEdit(recurringTransaction)}
                >
                  {t("common.edit")}
                </Button>
                <Button
                  className="flex-1"
                  variant="ghost"
                  onClick={() => onDelete(recurringTransaction)}
                >
                  {t("common.delete")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="font-medium text-white">{t("transactions.recurring.noRulesTitle")}</div>
          <p className="mt-1 text-sm text-mist">
            {t("transactions.recurring.noRulesBody")}
          </p>
        </div>
      )}
    </Card>
  );
}
