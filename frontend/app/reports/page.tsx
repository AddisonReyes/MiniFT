"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { PageFrame } from "@/components/page-frame";
import { SummaryCard } from "@/components/summary-card";
import { Card, Input, Select } from "@/components/ui";
import { api } from "@/lib/api";
import { useSessionQuery } from "@/lib/auth";
import {
  currentMonthInput,
  formatCurrency,
  monthInputToDate,
} from "@/lib/format";
import type {
  CategorySummary,
  MonthlySummary,
  TransactionType,
} from "@/lib/types";

export default function ReportsPage() {
  const session = useSessionQuery();
  const [month, setMonth] = useState(currentMonthInput());
  const [type, setType] =
    useState<Exclude<TransactionType, "transfer">>("expense");
  const monthDate = monthInputToDate(month);
  const currency = session.data?.currency || "USD";

  const summaryQuery = useQuery({
    queryKey: ["reports", "summary", monthDate],
    queryFn: () =>
      api.get<MonthlySummary>(
        `/transactions/summary/month?month=${encodeURIComponent(monthDate)}`,
      ),
  });

  const categoryQuery = useQuery({
    queryKey: ["reports", "categories", monthDate, type],
    queryFn: () =>
      api.get<CategorySummary>(
        `/transactions/summary/categories?month=${encodeURIComponent(monthDate)}&type=${encodeURIComponent(type)}`,
      ),
  });

  return (
    <PageFrame
      title="Reports"
      description="Review monthly performance and category concentration without leaving the main app."
      actions={
        <div className="flex flex-wrap gap-3">
          <Input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
          <Select
            value={type}
            onChange={(event) =>
              setType(
                event.target.value as Exclude<TransactionType, "transfer">,
              )
            }
          >
            <option value="expense">Expenses</option>
            <option value="income">Income</option>
          </Select>
        </div>
      }
    >
      <section className="metric-grid">
        <SummaryCard
          label="Income"
          value={formatCurrency(summaryQuery.data?.income_total || 0, currency)}
          meta="Monthly total"
        />
        <SummaryCard
          label="Expenses"
          value={formatCurrency(
            summaryQuery.data?.expense_total || 0,
            currency,
          )}
          meta="Monthly total"
        />
        <SummaryCard
          label="Net"
          value={formatCurrency(summaryQuery.data?.net_total || 0, currency)}
          meta="Income minus expenses"
        />
      </section>

      <Card className="mt-6 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Category breakdown</h2>
          <p className="mt-2 text-sm text-mist">
            Share of {type} for {month}.
          </p>
        </div>

        <div className="space-y-4">
          {categoryQuery.data?.items.length ? (
            categoryQuery.data.items.map((item) => (
              <div
                key={item.category}
                className="space-y-2 rounded-[22px] border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="font-medium text-white">{item.category}</div>
                  <div className="text-sm text-mist">
                    {formatCurrency(item.total, currency)} ·{" "}
                    {item.percentage.toFixed(2)}%
                  </div>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-signal"
                    style={{ width: `${Math.min(item.percentage, 100)}%` }}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-mist">
              No {type} data found for this month.
            </div>
          )}
        </div>
      </Card>
    </PageFrame>
  );
}
