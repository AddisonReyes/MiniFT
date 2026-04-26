"use client";

import { Badge, Button, Card, cn } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  transactionAmountClass,
  transactionTone,
} from "@/lib/transaction-display";
import type { Transaction } from "@/lib/types";

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
  return (
    <Card className="mt-6 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">Transaction list</h2>
          <p className="mt-1 text-sm text-mist">
            Transfers show as mirrored movements for each account involved.
          </p>
        </div>
        <Badge tone="neutral">{transactions.length} rows</Badge>
      </div>

      <div className="space-y-3 sm:hidden">
        {isLoading ? (
          <div className="empty-state">
            <div className="font-medium text-white">Loading transactions...</div>
            <p className="mt-1 text-sm text-mist">
              Pulling the latest entries for your filters.
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
                  <div className="truncate font-medium text-white">
                    {transaction.category}
                  </div>
                  <div className="mt-1 text-xs text-mist">
                    {transaction.account_name || "Cash"} ·{" "}
                    {formatDate(transaction.date)}
                  </div>
                </div>
                <div
                  className={cn(
                    "shrink-0 text-right font-semibold",
                    transactionAmountClass(transaction.display_type),
                  )}
                >
                  {formatCurrency(transaction.amount, currency)}
                </div>
              </div>

              {transaction.note ? (
                <div className="mt-3 text-xs text-mist">
                  {transaction.note}
                </div>
              ) : null}

              <div className="mt-4 flex flex-col gap-3">
                <Badge tone={transactionTone(transaction.display_type)}>
                  {transaction.display_type}
                </Badge>
                <div className="grid grid-cols-2 gap-2">
                  {transaction.display_type !== "transfer" ? (
                    <Button
                      variant="secondary"
                      onClick={() => onEdit(transaction)}
                    >
                      Edit
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
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <div className="font-medium text-white">No matching transactions</div>
            <p className="mt-1 text-sm text-mist">
              Adjust your filters or create a new entry to start tracking cash
              flow.
            </p>
          </div>
        )}
      </div>

      <div className="table-shell hidden sm:block">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.045] text-mist">
            <tr>
              <th className="px-3 py-3 font-medium sm:px-4">Type</th>
              <th className="px-3 py-3 font-medium sm:px-4">Category</th>
              <th className="px-3 py-3 font-medium sm:px-4">Account</th>
              <th className="px-3 py-3 font-medium sm:px-4">Date</th>
              <th className="px-3 py-3 text-right font-medium sm:px-4">
                Amount
              </th>
              <th className="px-3 py-3 text-right font-medium sm:px-4">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-4 py-7" colSpan={6}>
                  <div className="font-medium text-white">
                    Loading transactions...
                  </div>
                  <p className="mt-1 text-sm text-mist">
                    Pulling the latest entries for your filters.
                  </p>
                </td>
              </tr>
            ) : errorMessage ? (
              <tr>
                <td className="px-3 py-6 text-hazard sm:px-4" colSpan={6}>
                  {errorMessage}
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
                      {transaction.display_type}
                    </Badge>
                  </td>
                  <td className="px-3 py-4 sm:px-4">
                    <div className="font-medium text-white">
                      {transaction.category}
                    </div>
                    {transaction.note ? (
                      <div className="mt-1 max-w-xs text-xs text-mist">
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
                  <td
                    className={cn(
                      "px-3 py-4 text-right font-medium sm:px-4",
                      transactionAmountClass(transaction.display_type),
                    )}
                  >
                    {formatCurrency(transaction.amount, currency)}
                  </td>
                  <td className="px-3 py-4 sm:px-4">
                    <div className="flex justify-end gap-2">
                      {transaction.display_type !== "transfer" ? (
                        <Button
                          variant="secondary"
                          onClick={() => onEdit(transaction)}
                        >
                          Edit
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        onClick={() => onDelete(transaction)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-7" colSpan={6}>
                  <div className="font-medium text-white">
                    No matching transactions
                  </div>
                  <p className="mt-1 text-sm text-mist">
                    Adjust your filters or create a new entry to start tracking
                    cash flow.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
