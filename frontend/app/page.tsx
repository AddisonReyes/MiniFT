"use client";

import { useQuery } from "@tanstack/react-query";

import { PageFrame } from "@/components/page-frame";
import { SummaryCard } from "@/components/summary-card";
import { Card, Badge } from "@/components/ui";
import { useSessionQuery } from "@/lib/auth";
import { api } from "@/lib/api";
import {
  currentMonthInput,
  formatCurrency,
  formatDate,
  monthInputToDate,
} from "@/lib/format";
import type { Account, Budget, MonthlySummary, Transaction } from "@/lib/types";

export default function DashboardPage() {
  const session = useSessionQuery();
  const month = currentMonthInput();
  const monthDate = monthInputToDate(month);

  const summaryQuery = useQuery({
    queryKey: ["dashboard", "summary", monthDate],
    queryFn: () =>
      api.get<MonthlySummary>(
        `/transactions/summary/month?month=${encodeURIComponent(monthDate)}`,
      ),
  });

  const accountsQuery = useQuery({
    queryKey: ["dashboard", "accounts"],
    queryFn: () => api.get<Account[]>("/accounts"),
  });

  const budgetsQuery = useQuery({
    queryKey: ["dashboard", "budgets", monthDate],
    queryFn: () =>
      api.get<Budget[]>(`/budgets?month=${encodeURIComponent(monthDate)}`),
  });

  const transactionsQuery = useQuery({
    queryKey: ["dashboard", "transactions"],
    queryFn: () => api.get<Transaction[]>("/transactions"),
  });

  const currency = session.data?.currency || "USD";
  const summary = summaryQuery.data;
  const recentTransactions = (transactionsQuery.data || []).slice(0, 6);
  const topBudgets = (budgetsQuery.data || []).slice(0, 4);

  return (
    <PageFrame
      title="Dashboard"
      description="A compact monthly view across balances, spending, and the transactions that need attention."
    >
      <section className="metric-grid">
        <SummaryCard
          label="Income"
          value={formatCurrency(summary?.income_total || 0, currency)}
          meta="Current month"
        />
        <SummaryCard
          label="Expenses"
          value={formatCurrency(summary?.expense_total || 0, currency)}
          meta="Current month"
        />
        <SummaryCard
          label="Net"
          value={formatCurrency(summary?.net_total || 0, currency)}
          meta={
            summary && Number(summary.net_total) >= 0
              ? "Positive month"
              : "Watch spending"
          }
        />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold">Recent transactions</h2>
              <p className="mt-1 text-sm text-mist">
                Latest activity across your accounts.
              </p>
            </div>
            <Badge tone="neutral">{recentTransactions.length} shown</Badge>
          </div>

          <div className="space-y-3 sm:hidden">
            {recentTransactions.length ? (
              recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-white">
                        {transaction.category}
                      </div>
                      <div className="mt-1 text-xs text-mist">
                        {transaction.account_name || "Cash"} ·{" "}
                        {formatDate(transaction.date)}
                      </div>
                    </div>
                    <div className="shrink-0 text-right font-semibold text-white">
                      {formatCurrency(transaction.amount, currency)}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <Badge
                      tone={
                        transaction.display_type === "income"
                          ? "success"
                          : transaction.display_type === "expense"
                            ? "danger"
                            : "amber"
                      }
                    >
                      {transaction.display_type}
                    </Badge>
                    {transaction.note ? (
                      <span className="truncate text-xs text-mist">
                        {transaction.note}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-mist">
                No transactions recorded yet.
              </div>
            )}
          </div>

          <div className="table-shell hidden sm:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.03] text-mist">
                <tr>
                  <th className="px-3 py-3 font-medium sm:px-4">Type</th>
                  <th className="px-3 py-3 font-medium sm:px-4">Category</th>
                  <th className="px-3 py-3 font-medium sm:px-4">Account</th>
                  <th className="px-3 py-3 font-medium sm:px-4">Date</th>
                  <th className="px-3 py-3 text-right font-medium sm:px-4">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.length ? (
                  recentTransactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="border-b border-white/5 last:border-0"
                    >
                      <td className="px-3 py-4 sm:px-4">
                        <Badge
                          tone={
                            transaction.display_type === "income"
                              ? "success"
                              : transaction.display_type === "expense"
                                ? "danger"
                                : "amber"
                          }
                        >
                          {transaction.display_type}
                        </Badge>
                      </td>
                      <td className="px-3 py-4 sm:px-4">
                        <div className="font-medium text-white">
                          {transaction.category}
                        </div>
                        {transaction.note ? (
                          <div className="mt-1 text-xs text-mist">
                            {transaction.note}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-4 text-mist sm:px-4">
                        {transaction.account_name || "Cash"}
                      </td>
                      <td className="px-3 py-4 text-mist sm:px-4">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="px-3 py-4 text-right font-medium text-white sm:px-4">
                        {formatCurrency(transaction.amount, currency)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-mist" colSpan={5}>
                      No transactions recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold">Accounts</h2>
              <p className="mt-1 text-sm text-mist">
                Balances update directly from transaction flow.
              </p>
            </div>

            <div className="space-y-3">
              {(accountsQuery.data || []).map((account) => (
                <div
                  key={account.id}
                  className="flex flex-col gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-white">{account.name}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-mist">
                      {account.type}
                    </div>
                  </div>
                  <div className="break-words font-semibold text-white sm:text-right">
                    {formatCurrency(account.balance, currency)}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold">Budget watch</h2>
              <p className="mt-1 text-sm text-mist">
                Current-month categories with progress.
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
                      className="space-y-2 rounded-[22px] border border-white/10 bg-white/[0.03] p-4"
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
                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-mist">
                  No budgets set for this month yet.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </PageFrame>
  );
}
