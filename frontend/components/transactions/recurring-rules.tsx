"use client";

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
  return (
    <Card className="mt-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Recurring transactions</h2>
          <p className="mt-1 text-sm text-mist">
            The backend worker materializes entries when their next run date
            arrives.
          </p>
        </div>
        <Badge tone="neutral">{recurringTransactions.length} rules</Badge>
      </div>

      {isLoading ? (
        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-mist">
          Loading recurring transactions...
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
              className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium text-white">
                    {recurringTransaction.category}
                  </div>
                  <div className="mt-1 text-sm text-mist">
                    {recurringTransaction.type} on{" "}
                    {recurringTransaction.account_name}
                  </div>
                </div>
                <Badge
                  tone={
                    recurringTransaction.type === "income"
                      ? "success"
                      : "danger"
                  }
                >
                  {recurringTransaction.frequency}
                </Badge>
              </div>

              <div className="mt-4 space-y-2 text-sm text-mist">
                <div>
                  Amount:{" "}
                  {formatCurrency(recurringTransaction.amount, currency)}
                </div>
                <div>
                  Next run: {formatDate(recurringTransaction.next_run_date)}
                </div>
                {recurringTransaction.note ? (
                  <div>Note: {recurringTransaction.note}</div>
                ) : null}
              </div>

              <div className="mt-5 flex gap-3">
                <Button
                  className="flex-1"
                  variant="secondary"
                  onClick={() => onEdit(recurringTransaction)}
                >
                  Edit
                </Button>
                <Button
                  className="flex-1"
                  variant="ghost"
                  onClick={() => onDelete(recurringTransaction)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-mist">
          No recurring transactions configured.
        </div>
      )}
    </Card>
  );
}
