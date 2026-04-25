"use client";

import { Card, Input, Select } from "@/components/ui";
import type { Account } from "@/lib/types";
import type { TransactionFiltersState } from "@/lib/transactions";

export function TransactionFiltersCard({
  filters,
  accounts,
  onChange,
}: {
  filters: TransactionFiltersState;
  accounts: Account[];
  onChange: (patch: Partial<TransactionFiltersState>) => void;
}) {
  return (
    <Card className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Filters</h2>
        <p className="mt-1 text-sm text-mist">
          Narrow the transaction list by type, category, account, or date range.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="space-y-2">
          <label htmlFor="type">Type</label>
          <Select
            id="type"
            value={filters.type}
            onChange={(event) => onChange({ type: event.target.value })}
          >
            <option value="">All</option>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="transfer">Transfer</option>
          </Select>
        </div>

        <div className="space-y-2">
          <label htmlFor="category">Category</label>
          <Input
            id="category"
            value={filters.category}
            onChange={(event) => onChange({ category: event.target.value })}
            placeholder="Search category"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="account">Account</label>
          <Select
            id="account"
            value={filters.account_id}
            onChange={(event) => onChange({ account_id: event.target.value })}
          >
            <option value="">All accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <label htmlFor="start_date">Start Date</label>
          <Input
            id="start_date"
            type="date"
            value={filters.start_date}
            onChange={(event) => onChange({ start_date: event.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="end_date">End Date</label>
          <Input
            id="end_date"
            type="date"
            value={filters.end_date}
            onChange={(event) => onChange({ end_date: event.target.value })}
          />
        </div>
      </div>
    </Card>
  );
}
