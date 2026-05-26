"use client";

import { FormEvent, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import { FormError } from "@/components/form-error";
import { PageFrame } from "@/components/page-frame";
import { SummaryCard } from "@/components/summary-card";
import {
  Badge,
  Button,
  Card,
  Input,
  Modal,
  ModalActions,
  Select,
  cn,
} from "@/components/ui";
import {
  ACCOUNT_TYPE_OPTIONS,
  buildTrackedCurrencyOptions,
  buildCurrencyOptions,
  convertMoneyValueWithLookup,
  createExchangeRateLookup,
  createExchangeRateAutoValues,
  createExchangeRateFormValues,
  createExchangeRateManualValues,
  formatAccountTypeLabel,
  getTrackedCurrencies,
  readExchangeRateFormValue,
  readExchangeRateManualValue,
  summarizeAccountsWithLookup,
  writeExchangeRateFormValue,
  writeExchangeRateManualValue,
} from "@/lib/accounts";
import { ApiError, api } from "@/lib/api";
import { useSessionQuery } from "@/lib/auth";
import { formatCurrency, toNumber } from "@/lib/format";
import i18n from "@/lib/i18n/config";
import type { Account, AccountType, ExchangeRate } from "@/lib/types";

const ExchangeRatesModal = dynamic(
  () =>
    import("@/components/accounts/exchange-rates-modal").then(
      (module) => module.ExchangeRatesModal,
    ),
  { ssr: false },
);

const EMPTY_ACCOUNTS: Account[] = [];
const EMPTY_EXCHANGE_RATES: ExchangeRate[] = [];

function createInitialForm(defaultCurrency: string) {
  return {
    name: "",
    type: "bank_account" as AccountType,
    currency: defaultCurrency,
  };
}

function appendMissingRatesMeta(
  base: string,
  missingCount: number,
  t: TFunction,
) {
  if (!missingCount) {
    return base;
  }

  return `${base} · ${t("accounts.missingRate", { count: missingCount })}`;
}

export default function AccountsPage() {
  const { t } = useTranslation();
  const session = useSessionQuery();
  const defaultCurrency = session.data?.currency || "USD";
  const isSessionReady = Boolean(session.data);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [isExchangeRatesOpen, setExchangeRatesOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState(() => createInitialForm(defaultCurrency));
  const [exchangeRateForm, setExchangeRateForm] = useState<
    Record<string, string>
  >({});
  const [manualExchangeRateForm, setManualExchangeRateForm] = useState<
    Record<string, boolean>
  >({});

  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: () => api.get<Account[]>("/accounts"),
    enabled: isSessionReady,
    placeholderData: (previousData) => previousData,
  });

  const accounts = accountsQuery.data ?? EMPTY_ACCOUNTS;
  const requestedCurrencies = useMemo(
    () =>
      buildTrackedCurrencyOptions([
        defaultCurrency,
        ...accounts.map((account) => account.currency),
      ]),
    [accounts, defaultCurrency],
  );
  const exchangeRatesPath = useMemo(
    () =>
      requestedCurrencies.length > 1
        ? `/exchange-rates?currencies=${encodeURIComponent(
            requestedCurrencies.join(","),
          )}`
        : "/exchange-rates",
    [requestedCurrencies],
  );

  const exchangeRatesQuery = useQuery({
    queryKey: ["exchange-rates", requestedCurrencies.join(",")],
    queryFn: () => api.get<ExchangeRate[]>(exchangeRatesPath),
    enabled: isSessionReady,
    placeholderData: (previousData) => previousData,
  });

  const exchangeRates = exchangeRatesQuery.data ?? EMPTY_EXCHANGE_RATES;
  const currencies = useMemo(
    () => getTrackedCurrencies(accounts, defaultCurrency),
    [accounts, defaultCurrency],
  );
  const exchangeRateLookup = useMemo(
    () => createExchangeRateLookup(exchangeRates),
    [exchangeRates],
  );
  const autoExchangeRateValues = useMemo(
    () => createExchangeRateAutoValues(currencies, exchangeRates),
    [currencies, exchangeRates],
  );
  const currencyOptions = useMemo(
    () =>
      buildCurrencyOptions([defaultCurrency, form.currency, ...currencies]),
    [currencies, defaultCurrency, form.currency],
  );
  const { grossTotal, netTotal, missingCount } = summarizeAccountsWithLookup(
    accounts,
    defaultCurrency,
    exchangeRateLookup,
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
      await queryClient.invalidateQueries({ queryKey: ["exchange-rates"] });
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
      await queryClient.invalidateQueries({ queryKey: ["exchange-rates"] });
    },
  });

  const saveExchangeRatesMutation = useMutation({
    mutationFn: async () => {
      const rates = currencies.flatMap((fromCurrency) =>
        currencies
          .filter((toCurrency) => toCurrency !== fromCurrency)
          .flatMap((toCurrency) => {
            if (
              !readExchangeRateManualValue(
                manualExchangeRateForm,
                fromCurrency,
                toCurrency,
              )
            ) {
              return [];
            }

            const rate = readExchangeRateFormValue(
              exchangeRateForm,
              fromCurrency,
              toCurrency,
            ).trim();

            if (!rate) {
              throw new ApiError(
                i18n.t("exchangeRates.manualOverrideRequiresRate"),
                400,
              );
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
    setManualExchangeRateForm(
      createExchangeRateManualValues(currencies, exchangeRates),
    );
    saveExchangeRatesMutation.reset();
    setExchangeRatesOpen(true);
  }

  function closeExchangeRatesModal() {
    setExchangeRatesOpen(false);
    setManualExchangeRateForm({});
    saveExchangeRatesMutation.reset();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveMutation.mutate();
  }

  return (
    <PageFrame
      title={t("accounts.title")}
      description={t("accounts.description")}
      actions={
        <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
          <Button variant="secondary" onClick={openExchangeRates}>
            {t("accounts.exchangeRates")}
          </Button>
          <Button onClick={openCreate}>{t("accounts.addAccount")}</Button>
        </div>
      }
    >
      <section className="grid gap-4 md:grid-cols-2">
        <SummaryCard
          label={t("accounts.grossTotal")}
          value={formatCurrency(grossTotal, defaultCurrency)}
          meta={appendMissingRatesMeta(
            t("accounts.convertedTo", { currency: defaultCurrency }),
            missingCount,
            t,
          )}
        />
        <SummaryCard
          label={t("accounts.netTotal")}
          value={formatCurrency(netTotal, defaultCurrency)}
          meta={appendMissingRatesMeta(
            t("accounts.netTotalMeta", { currency: defaultCurrency }),
            missingCount,
            t,
          )}
        />
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {accounts.map((account) => {
          const convertedBalance =
            account.currency === defaultCurrency
              ? toNumber(account.balance)
              : convertMoneyValueWithLookup(
                  account.balance,
                  account.currency,
                  defaultCurrency,
                  exchangeRateLookup,
                );
          const isNegative = toNumber(account.balance) < 0;

          return (
            <Card
              key={account.id}
              className="space-y-5 transition hover:border-white/15 hover:bg-white/[0.035]"
            >
              <div className="flex flex-wrap gap-2">
                <Badge tone="neutral">
                  {formatAccountTypeLabel(account.type, t)}
                </Badge>
                <Badge tone="neutral">{account.currency}</Badge>
              </div>

              <div className="space-y-2">
                <h2 className="mobile-safe-text text-2xl font-semibold">{account.name}</h2>
                <p className="text-sm text-mist">{t("accounts.balance")}</p>
                <div
                  className={cn(
                    "mobile-safe-text text-3xl font-semibold",
                    isNegative ? "text-hazard" : "text-white",
                  )}
                >
                  {formatCurrency(account.balance, account.currency)}
                </div>

                {account.currency === defaultCurrency ? (
                   <p className="mobile-safe-text text-sm text-mist">
                    {t("accounts.includedInTotals", {
                      currency: defaultCurrency,
                    })}
                  </p>
                ) : convertedBalance !== null ? (
                  <p className="mobile-safe-text text-sm text-mist">
                    {t("accounts.convertedBalanceInTotals", {
                      amount: formatCurrency(convertedBalance, defaultCurrency),
                      currency: defaultCurrency,
                    })}
                  </p>
                ) : (
                  <p className="mobile-safe-text text-sm text-amber">
                    {t("accounts.conversionMissing", {
                      currency: defaultCurrency,
                    })}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  variant="secondary"
                  onClick={() => openEdit(account)}
                >
                  {t("common.edit")}
                </Button>
                <Button
                  className="flex-1"
                  variant="ghost"
                  onClick={() => {
                    if (window.confirm(t("accounts.deleteConfirm"))) {
                      deleteMutation.mutate(account.id);
                    }
                  }}
                >
                  {t("common.delete")}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {!accountsQuery.data?.length ? (
        <Card className="empty-state mt-6">
          <div className="font-medium text-white">
            {t("accounts.noAccountsTitle")}
          </div>
          <p className="mt-1 text-sm text-mist">
            {t("accounts.noAccountsBody")}
          </p>
        </Card>
      ) : null}

      <Modal
        open={open}
        title={editing ? t("accounts.editTitle") : t("accounts.addTitle")}
        subtitle={t("accounts.description")}
        onClose={closeAccountModal}
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="name">{t("accounts.name")}</label>
            <Input
              id="name"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder={t("accounts.namePlaceholder")}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="type">{t("accounts.type")}</label>
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
                    {t(option.labelKey)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="currency">{t("accounts.currency")}</label>
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
            fallbackMessage={t("accounts.errorFallbackAdd")}
          />

          <ModalActions>
            <Button
              className="flex-1 sm:flex-none"
              type="button"
              variant="ghost"
              onClick={closeAccountModal}
            >
              {t("common.cancel")}
            </Button>
            <Button className="flex-1 sm:flex-none" type="submit">
              {saveMutation.isPending
                ? t("accounts.saving")
                : editing
                  ? t("common.save")
                  : t("accounts.add")}
            </Button>
          </ModalActions>
        </form>
      </Modal>

      {isExchangeRatesOpen ? (
        <ExchangeRatesModal
          open
          currencies={currencies}
          defaultCurrency={defaultCurrency}
          exchangeRates={exchangeRates}
          values={exchangeRateForm}
          manualValues={manualExchangeRateForm}
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
          onManualChange={(fromCurrency, toCurrency, value) => {
            setManualExchangeRateForm((current) =>
              writeExchangeRateManualValue(
                current,
                fromCurrency,
                toCurrency,
                value,
              ),
            );

            if (!value) {
              setExchangeRateForm((current) =>
                writeExchangeRateFormValue(
                  current,
                  fromCurrency,
                  toCurrency,
                  autoExchangeRateValues[`${fromCurrency}:${toCurrency}`] ?? "",
                ),
              );
              return;
            }

            setExchangeRateForm((current) => {
              const currentValue = readExchangeRateFormValue(
                current,
                fromCurrency,
                toCurrency,
              ).trim();

              if (currentValue) {
                return current;
              }

              return writeExchangeRateFormValue(
                current,
                fromCurrency,
                toCurrency,
                autoExchangeRateValues[`${fromCurrency}:${toCurrency}`] ?? "",
              );
            });
          }}
          onClose={closeExchangeRatesModal}
          onSubmit={() => saveExchangeRatesMutation.mutate()}
        />
      ) : null}
    </PageFrame>
  );
}
