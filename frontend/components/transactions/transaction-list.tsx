"use client";

import { Badge, Button, Card } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Transaction } from "@/lib/types";

function transactionTone(displayType: Transaction["display_type"]) {
  switch (displayType) {
    case "income":
      return "success";
    case "expense":
      return "danger";
    default:
      return "amber";
  }
}

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Transaction list</h2>
          <p className="mt-1 text-sm text-mist">
            Transfers show as mirrored movements for each account involved.
          </p>
        </div>
        <Badge tone="neutral">{transactions.length} rows</Badge>
      </div>

      <div className="table-shell">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.03] text-mist">
            <tr>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Account</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-4 py-6 text-mist" colSpan={6}>
                  Loading transactions...
                </td>
              </tr>
            ) : errorMessage ? (
              <tr>
                <td className="px-4 py-6 text-hazard" colSpan={6}>
                  {errorMessage}
                </td>
              </tr>
            ) : transactions.length ? (
              transactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="border-b border-white/5 last:border-0"
                >
                  <td className="px-4 py-4">
                    <Badge tone={transactionTone(transaction.display_type)}>
                      {transaction.display_type}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-white">
                      {transaction.category}
                    </div>
                    {transaction.note ? (
                      <div className="mt-1 max-w-xs text-xs text-mist">
                        {transaction.note}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 text-mist">
                    {transaction.account_name || "Cash"}
                  </td>
                  <td className="px-4 py-4 text-mist">
                    {formatDate(transaction.date)}
                  </td>
                  <td className="px-4 py-4 text-right font-medium text-white">
                    {formatCurrency(transaction.amount, currency)}
                  </td>
                  <td className="px-4 py-4">
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
                <td className="px-4 py-6 text-mist" colSpan={6}>
                  No transactions match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
