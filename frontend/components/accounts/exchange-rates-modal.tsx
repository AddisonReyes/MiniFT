"use client";

import { FormEvent, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { FormError } from "@/components/form-error";
import { Button, Input, Modal, ModalActions, cn } from "@/components/ui";
import {
  createExchangeRateLookup,
  formatExchangeRateValue,
  readExchangeRateFormValue,
  readExchangeRateManualValue,
} from "@/lib/accounts";
import type { ExchangeRate } from "@/lib/types";

export function ExchangeRatesModal({
  open,
  currencies,
  defaultCurrency,
  exchangeRates,
  values,
  manualValues,
  isPending,
  error,
  onChange,
  onManualChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  currencies: string[];
  defaultCurrency: string;
  exchangeRates: ExchangeRate[];
  values: Record<string, string>;
  manualValues: Record<string, boolean>;
  isPending: boolean;
  error: unknown;
  onChange: (fromCurrency: string, toCurrency: string, value: string) => void;
  onManualChange: (
    fromCurrency: string,
    toCurrency: string,
    value: boolean,
  ) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const { t } = useTranslation();

  const exchangeRateLookup = useMemo(
    () => createExchangeRateLookup(exchangeRates),
    [exchangeRates],
  );
  const currencyPairs = useMemo(
    () =>
      currencies.flatMap((fromCurrency) =>
        currencies
          .filter((toCurrency) => toCurrency !== fromCurrency)
          .map((toCurrency) => ({ fromCurrency, toCurrency })),
      ),
    [currencies],
  );

  return (
    <Modal
      open={open}
      title={t("exchangeRates.title")}
      subtitle={`Frankfurter ${t("exchangeRates.description")} (${defaultCurrency})`}
      onClose={onClose}
    >
      <form
        className="space-y-5"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        {currencyPairs.length ? (
          <div className="space-y-4">
            {currencies.map((fromCurrency) => {
              const targets = currencies.filter(
                (toCurrency) => toCurrency !== fromCurrency,
              );

              return (
                <div
                  key={fromCurrency}
                  className="rounded-[26px] bg-[#111723]/80 p-5 shadow-[0_18px_48px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.02)]"
                >
                  <div className="mb-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-mist/90">
                      {t("transactions.transfer.fromAccount")}
                    </div>
                    <h3 className="mt-2 text-lg font-semibold">{fromCurrency}</h3>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {targets.map((toCurrency) => {
                      const value = readExchangeRateFormValue(
                        values,
                        fromCurrency,
                        toCurrency,
                      );
                      const isManual = readExchangeRateManualValue(
                        manualValues,
                        fromCurrency,
                        toCurrency,
                      );
                      const exchangeRate =
                        exchangeRateLookup.get(
                          `${fromCurrency}:${toCurrency}`,
                        ) ?? null;
                      const onlineValue = formatExchangeRateValue(
                        exchangeRate?.provider_rate ?? exchangeRate?.rate,
                      );

                      return (
                        <div
                          key={`${fromCurrency}-${toCurrency}`}
                          className="space-y-3 rounded-[22px] bg-[#0b1018]/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02),0_12px_30px_rgba(0,0,0,0.18)]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <label
                              htmlFor={`${fromCurrency}-${toCurrency}`}
                              className="text-sm font-medium text-white"
                            >
                              1 {fromCurrency} in {toCurrency}
                            </label>
                            <label
                              className={cn(
                                "flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition",
                                isManual
                                  ? "bg-signal/12 text-signal"
                                  : "bg-white/[0.045] text-mist",
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={isManual}
                                onChange={(event) =>
                                  onManualChange(
                                    fromCurrency,
                                    toCurrency,
                                    event.target.checked,
                                  )
                                }
                                className="h-4 w-4 rounded border-white/20 bg-transparent accent-[#7AE7B9]"
                              />
                              {t("exchangeRates.manualMode")}
                            </label>
                          </div>

                          <Input
                            id={`${fromCurrency}-${toCurrency}`}
                            inputMode="decimal"
                            value={value}
                            readOnly={!isManual}
                            onChange={(event) =>
                              onChange(
                                fromCurrency,
                                toCurrency,
                                event.target.value,
                              )
                            }
                            className={cn(
                              "bg-white/[0.03]",
                              !isManual && "cursor-default text-white/90",
                            )}
                          />

                          <p
                            className={cn(
                              "text-xs leading-5",
                              isManual
                                ? "text-signal"
                                : value
                                  ? "text-mist"
                                  : "text-amber",
                            )}
                          >
                            {isManual
                              ? onlineValue
                                ? `${t("exchangeRates.manualOverrideActive")} 1 ${fromCurrency} = ${onlineValue} ${toCurrency}.`
                                : t("exchangeRates.manualOverrideActive")
                              : value
                                ? `1 ${fromCurrency} = ${value} ${toCurrency}.`
                                : t("exchangeRates.noOnlineRate")}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <div className="font-medium text-white">{t("accounts.noAccountsTitle")}</div>
            <p className="mt-1 text-sm text-mist">
              {t("accounts.noAccountsBody")}
            </p>
          </div>
        )}

        <FormError
          error={error}
          fallbackMessage={t("exchangeRates.errorFallback")}
        />

        <ModalActions>
          <Button className="flex-1 sm:flex-none" type="button" variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button className="flex-1 sm:flex-none" type="submit">
            {isPending ? t("exchangeRates.saving") : t("exchangeRates.saveOverrides")}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}
