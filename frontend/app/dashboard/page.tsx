"use client";

import { useQuery } from "@tanstack/react-query";

import { PageFrame } from "@/components/page-frame";
import { SummaryCard } from "@/components/summary-card";
import { Card, Badge, cn } from "@/components/ui";
import { formatAccountTypeLabel } from "@/lib/accounts";
import { useSessionQuery } from "@/lib/auth";
import { api } from "@/lib/api";
import {
  currentMonthInput,
  formatCurrency,
  formatDate,
  monthInputToDate,
} from "@/lib/format";
import {
  transactionAmountClass,
  transactionTone,
} from "@/lib/transaction-display";
import type { Account, Budget, MonthlySummary, Transaction } from "@/lib/types";
import { useMediaQuery } from "@/lib/use-media-query";
import { useTranslation } from "react-i18next";

export default function DashboardPage() {
  const { t } = useTranslation();
  const session = useSessionQuery();
  const month = currentMonthInput();
  const monthDate = monthInputToDate(month);
  const showDesktopTransactions = useMediaQuery("(min-width: 640px)");
  const isSessionReady = Boolean(session.data);

  const summaryQuery = useQuery({
    queryKey: ["dashboard", "summary", monthDate],
    queryFn: () =>
      api.get<MonthlySummary>(
        `/transactions/summary/month?month=${encodeURIComponent(monthDate)}`,
      ),
    enabled: isSessionReady,
  });

  const accountsQuery = useQuery({
    queryKey: ["dashboard", "accounts"],
    queryFn: () => api.get<Account[]>("/accounts"),
    enabled: isSessionReady,
  });

  const budgetsQuery = useQuery({
    queryKey: ["dashboard", "budgets", monthDate],
    queryFn: () =>
      api.get<Budget[]>(`/budgets?month=${encodeURIComponent(monthDate)}`),
    enabled: isSessionReady,
  });

  const transactionsQuery = useQuery({
    queryKey: ["dashboard", "transactions"],
    queryFn: () => api.get<Transaction[]>("/transactions?limit=20"),
    enabled: isSessionReady,
  });

  const currency = session.data?.currency || "USD";
  const summary = summaryQuery.data;
  const recentTransactions = transactionsQuery.data || [];
  const topBudgets = (budgetsQuery.data || []).slice(0, 4);

  return (
    <PageFrame
      title={t("dashboard.title")}
      description={t("dashboard.description")}
    >
      <section className="metric-grid">
        <SummaryCard
          label={t("dashboard.income")}
          value={formatCurrency(summary?.income_total || 0, currency)}
          meta={t("dashboard.currentMonth")}
        />
        <SummaryCard
          label={t("dashboard.expenses")}
          value={formatCurrency(summary?.expense_total || 0, currency)}
          meta={t("dashboard.currentMonth")}
        />
        <SummaryCard
          label={t("dashboard.net")}
          value={formatCurrency(summary?.net_total || 0, currency)}
          meta={
            summary && Number(summary.net_total) >= 0
              ? t("dashboard.positiveMonth")
              : t("dashboard.watchSpending")
          }
        />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold">{t("dashboard.recentTransactions")}</h2>
              <p className="mt-1 text-sm text-mist">
                {t("dashboard.recentTransactionsSubtext")}
              </p>
            </div>
            <Badge tone="neutral">{t("dashboard.shown", { count: recentTransactions.length })}</Badge>
          </div>

          {showDesktopTransactions ? (
            <div className="table-shell">
              <table className="w-full table-fixed text-left text-sm">
                <colgroup>
                  <col className="w-[30%]" />
                  <col className="w-[30%]" />
                  <col className="w-[40%]" />
                </colgroup>
                <thead className="border-b border-white/10 bg-white/[0.045] text-mist">
                  <tr>
                    <th className="px-3 py-3 font-medium sm:px-4">{t("dashboard.category")}</th>
                    <th className="px-3 py-3 font-medium sm:px-4">{t("dashboard.date")}</th>
                    <th className="px-3 py-3 text-right font-medium sm:px-4">
                      {t("dashboard.amount")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.length ? (
                    recentTransactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="border-b border-white/5 transition hover:bg-white/[0.025] last:border-0"
                      >
                        <td className="px-3 py-4 align-top sm:px-4">
                          <div className="mobile-safe-text font-medium text-white">
                            {transaction.category}
                          </div>
                          {transaction.note ? (
                            <div className="mobile-safe-text mt-1 text-xs text-mist">
                              {transaction.note}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-4 text-mist sm:px-4">
                          {formatDate(transaction.date)}
                        </td>
                        <td
                          className={cn(
                            "whitespace-nowrap px-3 py-4 text-right font-medium sm:px-4",
                            transactionAmountClass(transaction.display_type),
                          )}
                        >
                          {formatCurrency(
                            transaction.amount,
                            transaction.account_currency || currency,
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-7" colSpan={3}>
                        <div className="font-medium text-white">
                          {t("dashboard.noTransactionsTitle")}
                        </div>
                        <p className="mt-1 text-sm text-mist">
                          {t("dashboard.noTransactionsBody")}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.length ? (
                recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mobile-safe-text font-medium text-white">
                          {transaction.category}
                        </div>
                        <div className="mobile-safe-text mt-1 text-xs text-mist">
                          {transaction.account_name || t("common.cash")} ·{" "}
                          {formatDate(transaction.date)}
                        </div>
                      </div>
                      <div
                        className={cn(
                          "mobile-safe-text shrink-0 text-right font-semibold",
                          transactionAmountClass(transaction.display_type),
                        )}
                      >
                        {formatCurrency(
                          transaction.amount,
                          transaction.account_currency || currency,
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <Badge tone={transactionTone(transaction.display_type)}>
                        {t(`displayType.${transaction.display_type}`, {
                          defaultValue: transaction.display_type,
                        })}
                      </Badge>
                      {transaction.note ? (
                        <span className="mobile-safe-text text-xs text-mist">
                          {transaction.note}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <div className="font-medium text-white">
                    {t("dashboard.noTransactionsTitle")}
                  </div>
                  <p className="mt-1 text-sm text-mist">
                    {t("dashboard.noTransactionsBody")}
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold">{t("dashboard.accounts")}</h2>
              <p className="mt-1 text-sm text-mist">
                {t("dashboard.accountsSubtext")}
              </p>
            </div>

            <div className="space-y-3">
              {(accountsQuery.data || []).map((account) => (
                <div
                  key={account.id}
                  className="flex flex-col gap-3 rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-4 transition hover:bg-white/[0.045] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-white">{account.name}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-mist">
                      {formatAccountTypeLabel(account.type, t)} ·{" "}
                      {account.currency}
                    </div>
                  </div>
                  <div className="mobile-safe-text font-semibold text-white sm:text-right">
                    {formatCurrency(account.balance, account.currency)}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold">{t("dashboard.budgetWatch")}</h2>
              <p className="mt-1 text-sm text-mist">
                {t("dashboard.budgetWatchSubtext")}
              </p>
            </div>

            <div className="space-y-4">
              {topBudgets.length ? (
                topBudgets.map((budget) => {
                  const spent = Number(budget.spent_amount);
                  const limit = Math.max(Number(budget.limit_amount), 1);
                  const progress = Math.min((spent / limit) * 100, 100);

                  return (
                    <div
                      key={budget.id}
                      className="space-y-2 rounded-[20px] border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.045]"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="font-medium text-white">
                          {budget.category}
                        </div>
                        <div className="text-sm text-mist">
                          {formatCurrency(budget.spent_amount, currency)} /{" "}
                          {formatCurrency(budget.limit_amount, currency)}
                        </div>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-signal transition"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="empty-state">
                  <div className="font-medium text-white">{t("dashboard.noBudgetsTitle")}</div>
                  <p className="mt-1 text-sm text-mist">
                    {t("dashboard.noBudgetsBody")}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </PageFrame>
  );
}
