"use client";

import { useMemo, useState } from "react";

import { Button, Card, Input, Select, cn } from "@/components/ui";
import type { Account } from "@/lib/types";
import type { TransactionFiltersState } from "@/lib/transactions";
import { useTranslation } from "react-i18next";

function createActiveFilters(
  filters: TransactionFiltersState,
  accounts: Account[],
) {
  const items: string[] = [];

  if (filters.type) {
    items.push(filters.type);
  }

  if (filters.category.trim()) {
    items.push(filters.category.trim());
  }

  if (filters.account_id) {
    const account = accounts.find((item) => item.id === filters.account_id);

    if (account) {
      items.push(account.name);
    }
  }

  if (filters.start_date) {
    items.push(`from ${filters.start_date}`);
  }

  if (filters.end_date) {
    items.push(`to ${filters.end_date}`);
  }

  return items;
}

export function TransactionFiltersCard({
  filters,
  accounts,
  onChange,
  onReset,
}: {
  filters: TransactionFiltersState;
  accounts: Account[];
  onChange: (patch: Partial<TransactionFiltersState>) => void;
  onReset: () => void;
}) {
  const { t } = useTranslation();
  const [isOpen, setOpen] = useState(false);
  const activeFilters = useMemo(
    () => createActiveFilters(filters, accounts),
    [accounts, filters],
  );
  const hasActiveFilters = activeFilters.length > 0;

  return (
    <Card className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">{t("transactions.filters.title")}</h2>
          <p className="mt-1 text-sm text-mist">
            {t("transactions.description")}
          </p>
          {hasActiveFilters ? (
            <div className="mt-3 flex flex-wrap gap-2 sm:hidden">
              {activeFilters.map((filter) => (
                <span
                  key={filter}
                  className="mobile-safe-text inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-mist"
                >
                  {filter}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex gap-2 sm:shrink-0">
          {hasActiveFilters ? (
            <Button
              className="flex-1 sm:flex-none"
              variant="ghost"
              onClick={onReset}
            >
              {t("common.cancel")}
            </Button>
          ) : null}
          <Button
            className="flex-1 sm:hidden"
            variant="secondary"
            onClick={() => setOpen((current) => !current)}
          >
            {isOpen
              ? t("transactions.filters.title")
              : hasActiveFilters
                ? `${t("transactions.filters.title")} (${activeFilters.length})`
                : t("transactions.filters.title")}
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "grid gap-4 sm:grid-cols-2 xl:grid-cols-5",
          !isOpen && "hidden sm:grid",
        )}
      >
        <div className="space-y-2">
          <label htmlFor="type">{t("transactions.filters.type")}</label>
          <Select
            id="type"
            value={filters.type}
            onChange={(event) => onChange({ type: event.target.value })}
          >
            <option value="">{t("transactions.filters.allTypes")}</option>
            <option value="expense">{t("transactions.filters.expense")}</option>
            <option value="income">{t("transactions.filters.income")}</option>
            <option value="transfer">{t("transactions.filters.transfer")}</option>
          </Select>
        </div>

        <div className="space-y-2">
          <label htmlFor="category">{t("transactions.list.category")}</label>
          <Input
            id="category"
            value={filters.category}
            onChange={(event) => onChange({ category: event.target.value })}
            placeholder={t("transactions.filters.searchPlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="account">{t("transactions.filters.account")}</label>
          <Select
            id="account"
            value={filters.account_id}
            onChange={(event) => onChange({ account_id: event.target.value })}
          >
            <option value="">{t("transactions.filters.allAccounts")}</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <label htmlFor="start_date">{t("transactions.filters.month")}</label>
          <Input
            id="start_date"
            type="date"
            value={filters.start_date}
            onChange={(event) => onChange({ start_date: event.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="end_date">{t("transactions.filters.search")}</label>
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
