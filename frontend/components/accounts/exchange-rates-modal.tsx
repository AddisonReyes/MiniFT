"use client";

import { FormEvent } from "react";

import { FormError } from "@/components/form-error";
import { Button, Input, Modal, cn } from "@/components/ui";
import {
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
  const currencyPairs = currencies.flatMap((fromCurrency) =>
    currencies
      .filter((toCurrency) => toCurrency !== fromCurrency)
      .map((toCurrency) => ({ fromCurrency, toCurrency })),
  );

  return (
    <Modal
      open={open}
      title="Currency conversions"
      subtitle={`Frankfurter fills these pairs automatically for your ${defaultCurrency} totals. Enable manual on any pair to save a custom override.`}
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
                      From
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
                      const exchangeRate = exchangeRates.find(
                        (item) =>
                          item.from_currency === fromCurrency &&
                          item.to_currency === toCurrency,
                      );
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
                              Manual
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
                                ? `Manual override active. Online reference: 1 ${fromCurrency} = ${onlineValue} ${toCurrency}.`
                                : "Manual override active for this pair."
                              : value
                                ? `Auto rate: 1 ${fromCurrency} = ${value} ${toCurrency}. Refreshed daily and cached as fallback.`
                                : "No online rate is available right now. Enable manual mode to set one."}
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
            <div className="font-medium text-white">No currency pairs yet</div>
            <p className="mt-1 text-sm text-mist">
              Add an account with a different currency to manage conversion
              rates here.
            </p>
          </div>
        )}

        <FormError
          error={error}
          fallbackMessage="Unable to save exchange rate overrides"
        />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {isPending ? "Saving..." : "Save overrides"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
