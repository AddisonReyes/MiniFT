"use client";

import { Badge, Button, Card, cn } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  transactionAmountClass,
  transactionTone,
} from "@/lib/transaction-display";
import type { Transaction } from "@/lib/types";
import { useMediaQuery } from "@/lib/use-media-query";
import { useTranslation } from "react-i18next";

export function TransactionListSection({
  transactions,
  currency,
  isLoading,
  errorMessage,
  onEdit,
  onDelete,
}: {
  transactions: Transaction[];
  currency: string;
  isLoading: boolean;
  errorMessage?: string;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}) {
  const { t } = useTranslation();
  const showDesktopTable = useMediaQuery("(min-width: 640px)");

  return (
    <Card className="mt-6 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">{t("transactions.title")}</h2>
          <p className="mt-1 text-sm text-mist">
            {t("transactions.description")}
          </p>
        </div>
        <Badge tone="neutral">
          {t("transactions.list.shown", { count: transactions.length })}
        </Badge>
      </div>

      {showDesktopTable ? (
        <div className="table-shell">
          <table className="w-full min-w-[860px] table-fixed text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.045] text-mist">
              <tr>
                <th className="px-3 py-3 font-medium sm:px-4">
                  {t("transactions.filters.type")}
                </th>
                <th className="px-3 py-3 font-medium sm:px-4">
                  {t("transactions.list.category")}
                </th>
                <th className="px-3 py-3 font-medium sm:px-4">
                  {t("transactions.list.account")}
                </th>
                <th className="px-3 py-3 font-medium sm:px-4">
                  {t("transactions.list.date")}
                </th>
                <th className="px-3 py-3 text-right font-medium sm:px-4">
                  {t("transactions.list.amount")}
                </th>
                <th className="px-3 py-3 text-right font-medium sm:px-4">
                  {t("transactions.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-4 py-7" colSpan={6}>
                    <div className="font-medium text-white">
                      {t("transactions.list.loading")}
                    </div>
                    <p className="mt-1 text-sm text-mist">
                      {t("transactions.list.loadingBody")}
                    </p>
                  </td>
                </tr>
              ) : errorMessage ? (
                <tr>
                  <td className="px-3 py-6 sm:px-4" colSpan={6}>
                    <div className="font-medium text-hazard">
                      {t("transactions.list.errorTitle")}
                    </div>
                    <p className="mt-1 text-sm text-hazard/80">
                      {errorMessage}
                    </p>
                  </td>
                </tr>
              ) : transactions.length ? (
                transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="border-b border-white/5 transition hover:bg-white/[0.025] last:border-0"
                  >
                    <td className="px-3 py-4 sm:px-4">
                      <Badge tone={transactionTone(transaction.display_type)}>
                        {t(`displayType.${transaction.display_type}`, {
                          defaultValue: transaction.display_type,
                        })}
                      </Badge>
                    </td>
                    <td className="px-3 py-4 align-top sm:px-4">
                      <div className="break-all font-medium text-white">
                        {transaction.category}
                      </div>
                      {transaction.note ? (
                        <div className="mt-1 break-all text-xs text-mist">
                          {transaction.note}
                        </div>
                      ) : null}
                    </td>
                    <td className="break-all px-3 py-4 text-mist sm:px-4">
                      {transaction.account_name || t("common.cash")}
                    </td>
                    <td className="px-3 py-4 text-mist sm:px-4">
                      {formatDate(transaction.date)}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-4 text-right font-medium sm:px-4",
                        transactionAmountClass(transaction.display_type),
                      )}
                    >
                      {formatCurrency(
                        transaction.amount,
                        transaction.account_currency || currency,
                      )}
                    </td>
                    <td className="px-3 py-4 sm:px-4">
                      <div className="flex justify-end gap-2">
                        {transaction.display_type !== "transfer" ? (
                          <Button
                            variant="secondary"
                            onClick={() => onEdit(transaction)}
                          >
                            {t("common.edit")}
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          onClick={() => onDelete(transaction)}
                        >
                          {t("common.delete")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-7" colSpan={6}>
                    <div className="font-medium text-white">
                      {t("transactions.list.noResults")}
                    </div>
                    <p className="mt-1 text-sm text-mist">
                      {t("transactions.list.noResultsBody")}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-3">
          {isLoading ? (
            <div className="empty-state">
              <div className="font-medium text-white">
                {t("transactions.list.loading")}
              </div>
              <p className="mt-1 text-sm text-mist">
                {t("transactions.list.loadingBody")}
              </p>
            </div>
          ) : errorMessage ? (
            <div className="rounded-[20px] border border-hazard/20 bg-hazard/10 px-4 py-6 text-sm text-hazard">
              {errorMessage}
            </div>
          ) : transactions.length ? (
            transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="break-all font-medium text-white">
                      {transaction.category}
                    </div>
                    <div className="mt-1 text-xs text-mist">
                      {transaction.account_name || t("common.cash")} ·{" "}
                      {formatDate(transaction.date)}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "shrink-0 text-right font-semibold",
                      transactionAmountClass(transaction.display_type),
                    )}
                  >
                    {formatCurrency(
                      transaction.amount,
                      transaction.account_currency || currency,
                    )}
                  </div>
                </div>

                {transaction.note ? (
                  <div className="mt-3 break-all text-xs text-mist">
                    {transaction.note}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-col gap-3">
                  <Badge tone={transactionTone(transaction.display_type)}>
                    {t(`displayType.${transaction.display_type}`, {
                      defaultValue: transaction.display_type,
                    })}
                  </Badge>
                  <div className="grid grid-cols-2 gap-2">
                    {transaction.display_type !== "transfer" ? (
                      <Button
                        variant="secondary"
                        onClick={() => onEdit(transaction)}
                      >
                        {t("common.edit")}
                      </Button>
                    ) : null}
                    <Button
                      className={
                        transaction.display_type === "transfer"
                          ? "col-span-2"
                          : undefined
                      }
                      variant="ghost"
                      onClick={() => onDelete(transaction)}
                    >
                      {t("common.delete")}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="font-medium text-white">
                {t("transactions.list.noResults")}
              </div>
              <p className="mt-1 text-sm text-mist">
                {t("transactions.list.emptyMobileBody")}
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
