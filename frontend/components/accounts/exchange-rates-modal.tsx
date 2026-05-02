"use client";

import { FormEvent } from "react";

import { FormError } from "@/components/form-error";
import { Button, Input, Modal } from "@/components/ui";
import { readExchangeRateFormValue } from "@/lib/accounts";

export function ExchangeRatesModal({
  open,
  currencies,
  defaultCurrency,
  values,
  isPending,
  error,
  onChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  currencies: string[];
  defaultCurrency: string;
  values: Record<string, string>;
  isPending: boolean;
  error: unknown;
  onChange: (fromCurrency: string, toCurrency: string, value: string) => void;
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
      subtitle={`These rates convert account balances into your default ${defaultCurrency} totals.`}
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
                  className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="mb-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-mist">
                      From
                    </div>
                    <h3 className="mt-2 text-lg font-semibold">{fromCurrency}</h3>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {targets.map((toCurrency) => (
                      <div key={`${fromCurrency}-${toCurrency}`} className="space-y-2">
                        <label htmlFor={`${fromCurrency}-${toCurrency}`}>
                          1 {fromCurrency} in {toCurrency}
                        </label>
                        <Input
                          id={`${fromCurrency}-${toCurrency}`}
                          inputMode="decimal"
                          placeholder="1.000000"
                          value={readExchangeRateFormValue(
                            values,
                            fromCurrency,
                            toCurrency,
                          )}
                          onChange={(event) =>
                            onChange(
                              fromCurrency,
                              toCurrency,
                              event.target.value,
                            )
                          }
                        />
                      </div>
                    ))}
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
          fallbackMessage="Unable to save exchange rates"
        />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {isPending ? "Saving..." : "Save rates"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
