"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ExchangeRatesModal } from "@/components/accounts/exchange-rates-modal";
import { FormError } from "@/components/form-error";
import { PageFrame } from "@/components/page-frame";
import { SummaryCard } from "@/components/summary-card";
import { Badge, Button, Card, Input, Modal, Select, cn } from "@/components/ui";
import {
  ACCOUNT_TYPE_OPTIONS,
  buildCurrencyOptions,
  convertMoneyValue,
  createExchangeRateFormValues,
  formatAccountTypeLabel,
  getTrackedCurrencies,
  summarizeAccounts,
  writeExchangeRateFormValue,
} from "@/lib/accounts";
import { api } from "@/lib/api";
import { useSessionQuery } from "@/lib/auth";
import { formatCurrency, toNumber } from "@/lib/format";
import type { Account, AccountType, ExchangeRate } from "@/lib/types";

function createInitialForm(defaultCurrency: string) {
  return {
    name: "",
    type: "bank_account" as AccountType,
    currency: defaultCurrency,
  };
}

function appendMissingRatesMeta(base: string, missingCount: number) {
  if (!missingCount) {
    return base;
  }

  const suffix =
    missingCount === 1
      ? "1 account missing a rate"
      : `${missingCount} accounts missing rates`;

  return `${base} · ${suffix}`;
}

export default function AccountsPage() {
  const session = useSessionQuery();
  const defaultCurrency = session.data?.currency || "USD";
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [isExchangeRatesOpen, setExchangeRatesOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState(() => createInitialForm(defaultCurrency));
  const [exchangeRateForm, setExchangeRateForm] = useState<
    Record<string, string>
  >({});

  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: () => api.get<Account[]>("/accounts"),
  });

  const exchangeRatesQuery = useQuery({
    queryKey: ["exchange-rates"],
    queryFn: () => api.get<ExchangeRate[]>("/exchange-rates"),
  });

  const accounts = accountsQuery.data ?? [];
  const exchangeRates = exchangeRatesQuery.data ?? [];
  const currencies = getTrackedCurrencies(
    accounts,
    defaultCurrency,
    exchangeRates,
  );
  const currencyOptions = buildCurrencyOptions([
    defaultCurrency,
    form.currency,
    ...currencies,
  ]);
  const { grossTotal, netTotal, missingCount } = summarizeAccounts(
    accounts,
    defaultCurrency,
    exchangeRates,
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        return api.put<Account>(`/accounts/${editing.id}`, form);
      }

      return api.post<Account>("/accounts", form);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setOpen(false);
      setEditing(null);
      setForm(createInitialForm(defaultCurrency));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (accountId: string) =>
      api.delete<{ message: string }>(`/accounts/${accountId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  const saveExchangeRatesMutation = useMutation({
    mutationFn: async () => {
      const rates = currencies.flatMap((fromCurrency) =>
        currencies
          .filter((toCurrency) => toCurrency !== fromCurrency)
          .flatMap((toCurrency) => {
            const rate =
              exchangeRateForm[`${fromCurrency}:${toCurrency}`]?.trim();

            if (!rate) {
              return [];
            }

            return [
              {
                from_currency: fromCurrency,
                to_currency: toCurrency,
                rate,
              },
            ];
          }),
      );

      return api.put<ExchangeRate[]>("/exchange-rates", { rates });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["exchange-rates"] });
      setExchangeRatesOpen(false);
    },
  });

  function closeAccountModal() {
    setOpen(false);
    setEditing(null);
    setForm(createInitialForm(defaultCurrency));
    saveMutation.reset();
  }

  function openCreate() {
    setEditing(null);
    setForm(createInitialForm(defaultCurrency));
    saveMutation.reset();
    setOpen(true);
  }

  function openEdit(account: Account) {
    setEditing(account);
    setForm({
      name: account.name,
      type: account.type,
      currency: account.currency,
    });
    saveMutation.reset();
    setOpen(true);
  }

  function openExchangeRates() {
    setExchangeRateForm(
      createExchangeRateFormValues(currencies, exchangeRates),
    );
    saveExchangeRatesMutation.reset();
    setExchangeRatesOpen(true);
  }

  function closeExchangeRatesModal() {
    setExchangeRatesOpen(false);
    saveExchangeRatesMutation.reset();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveMutation.mutate();
  }

  return (
    <PageFrame
      title="Accounts"
      description="Manage cash, bank accounts, credit cards, and loans while keeping balances and conversions organized."
      actions={
        <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
          <Button variant="secondary" onClick={openExchangeRates}>
            Conversions
          </Button>
          <Button onClick={openCreate}>New account</Button>
        </div>
      }
    >
      <section className="grid gap-4 md:grid-cols-2">
        <SummaryCard
          label="Gross total"
          value={formatCurrency(grossTotal, defaultCurrency)}
          meta={appendMissingRatesMeta(
            `Converted to ${defaultCurrency}`,
            missingCount,
          )}
        />
        <SummaryCard
          label="Net total"
          value={formatCurrency(netTotal, defaultCurrency)}
          meta={appendMissingRatesMeta(
            `Negative balances excluded · Base ${defaultCurrency}`,
            missingCount,
          )}
        />
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {accounts.map((account) => {
          const convertedBalance =
            account.currency === defaultCurrency
              ? toNumber(account.balance)
              : convertMoneyValue(
                  account.balance,
                  account.currency,
                  defaultCurrency,
                  exchangeRates,
                );
          const isNegative = toNumber(account.balance) < 0;

          return (
            <Card
              key={account.id}
              className="space-y-5 transition hover:border-white/15 hover:bg-white/[0.035]"
            >
              <div className="flex flex-wrap gap-2">
                <Badge tone="neutral">
                  {formatAccountTypeLabel(account.type)}
                </Badge>
                <Badge tone="neutral">{account.currency}</Badge>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">{account.name}</h2>
                <p className="text-sm text-mist">Current balance</p>
                <div
                  className={cn(
                    "text-3xl font-semibold",
                    isNegative ? "text-hazard" : "text-white",
                  )}
                >
                  {formatCurrency(account.balance, account.currency)}
                </div>

                {account.currency === defaultCurrency ? (
                  <p className="text-sm text-mist">
                    Included directly in {defaultCurrency} totals.
                  </p>
                ) : convertedBalance !== null ? (
                  <p className="text-sm text-mist">
                    {formatCurrency(convertedBalance, defaultCurrency)} in{" "}
                    {defaultCurrency} totals.
                  </p>
                ) : (
                  <p className="text-sm text-amber">
                    Conversion to {defaultCurrency} is not set yet.
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  variant="secondary"
                  onClick={() => openEdit(account)}
                >
                  Edit
                </Button>
                <Button
                  className="flex-1"
                  variant="ghost"
                  onClick={() => {
                    if (window.confirm(`Delete ${account.name}?`)) {
                      deleteMutation.mutate(account.id);
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {!accountsQuery.data?.length ? (
        <Card className="empty-state mt-6">
          <div className="font-medium text-white">No accounts yet</div>
          <p className="mt-1 text-sm text-mist">
            Add cash, bank accounts, credit cards, or loans to separate balances
            and track their impact on your totals.
          </p>
        </Card>
      ) : null}

      <Modal
        open={open}
        title={editing ? "Edit account" : "Create account"}
        subtitle="Accounts keep balances separate while transfers move money between them."
        onClose={closeAccountModal}
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="name">Name</label>
            <Input
              id="name"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Emergency fund"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="type">Type</label>
              <Select
                id="type"
                value={form.type}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    type: event.target.value as AccountType,
                  }))
                }
              >
                {ACCOUNT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="currency">Currency</label>
              <Select
                id="currency"
                value={form.currency}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    currency: event.target.value,
                  }))
                }
              >
                {currencyOptions.map((currencyOption) => (
                  <option key={currencyOption} value={currencyOption}>
                    {currencyOption}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <FormError
            error={saveMutation.error}
            fallbackMessage="Unable to save account"
          />

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={closeAccountModal}>
              Cancel
            </Button>
            <Button type="submit">
              {saveMutation.isPending
                ? "Saving..."
                : editing
                  ? "Save changes"
                  : "Create account"}
            </Button>
          </div>
        </form>
      </Modal>

      <ExchangeRatesModal
        open={isExchangeRatesOpen}
        currencies={currencies}
        defaultCurrency={defaultCurrency}
        values={exchangeRateForm}
        isPending={saveExchangeRatesMutation.isPending}
        error={saveExchangeRatesMutation.error}
        onChange={(fromCurrency, toCurrency, value) =>
          setExchangeRateForm((current) =>
            writeExchangeRateFormValue(
              current,
              fromCurrency,
              toCurrency,
              value,
            ),
          )
        }
        onClose={closeExchangeRatesModal}
        onSubmit={() => saveExchangeRatesMutation.mutate()}
      />
    </PageFrame>
  );
}
