import { SUPPORTED_CURRENCIES } from "@/lib/constants";
import { toNumber } from "@/lib/format";
import type {
  Account,
  AccountType,
  ExchangeRate,
  MoneyValue,
} from "@/lib/types";

export type ExchangeRateLookup = Map<string, ExchangeRate>;

export const ACCOUNT_TYPE_OPTIONS: Array<{
  value: AccountType;
  label: string;
}> = [
  { value: "cash", label: "Cash" },
  { value: "bank_account", label: "Bank account" },
  { value: "credit_card", label: "Credit card" },
  { value: "loan", label: "Loan" },
];

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: "Cash",
  bank_account: "Bank account",
  credit_card: "Credit card",
  loan: "Loan",
};

export function formatAccountTypeLabel(type: AccountType) {
  return ACCOUNT_TYPE_LABELS[type];
}

export function normalizeCurrencyCode(value: string) {
  return value.trim().toUpperCase();
}

export function buildCurrencyOptions(currencies: string[]) {
  return Array.from(
    new Set(
      [...SUPPORTED_CURRENCIES, ...currencies]
        .map(normalizeCurrencyCode)
        .filter(Boolean),
    ),
  ).sort((first, second) => first.localeCompare(second));
}

export function buildTrackedCurrencyOptions(currencies: string[]) {
  return Array.from(
    new Set([
      ...currencies.map(normalizeCurrencyCode),
    ]),
  ).filter(Boolean);
}

export function getTrackedCurrencies(
  accounts: Account[],
  defaultCurrency: string,
) {
  return buildTrackedCurrencyOptions([
    defaultCurrency,
    ...accounts.map((account) => account.currency),
  ]);
}

function exchangeRateKey(fromCurrency: string, toCurrency: string) {
  return `${normalizeCurrencyCode(fromCurrency)}:${normalizeCurrencyCode(toCurrency)}`;
}

export function createExchangeRateLookup(
  exchangeRates: ExchangeRate[],
): ExchangeRateLookup {
  return new Map(
    exchangeRates.map((rate) => [
      exchangeRateKey(rate.from_currency, rate.to_currency),
      rate,
    ]),
  );
}

function findExactExchangeRateInLookup(
  exchangeRateLookup: ExchangeRateLookup,
  fromCurrency: string,
  toCurrency: string,
) {
  return (
    exchangeRateLookup.get(exchangeRateKey(fromCurrency, toCurrency)) ?? null
  );
}

function findExchangeRateInLookup(
  exchangeRateLookup: ExchangeRateLookup,
  fromCurrency: string,
  toCurrency: string,
) {
  const from = normalizeCurrencyCode(fromCurrency);
  const to = normalizeCurrencyCode(toCurrency);

  if (from === to) {
    return 1;
  }

  const direct = findExactExchangeRateInLookup(exchangeRateLookup, from, to);

  if (direct) {
    const rate = toNumber(direct.rate);

    if (Number.isFinite(rate) && rate > 0) {
      return rate;
    }
  }

  const inverse = findExactExchangeRateInLookup(exchangeRateLookup, to, from);

  if (inverse) {
    const rate = toNumber(inverse.rate);

    if (Number.isFinite(rate) && rate > 0) {
      return 1 / rate;
    }
  }

  return null;
}

function formatRateInputValue(value: number) {
  const normalized = value.toFixed(6).replace(/\.?0+$/, "");
  return normalized || "1";
}

export function formatExchangeRateValue(value: MoneyValue | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  return formatRateInputValue(toNumber(value));
}

export function findExchangeRate(
  exchangeRates: ExchangeRate[],
  fromCurrency: string,
  toCurrency: string,
) {
  return findExchangeRateInLookup(
    createExchangeRateLookup(exchangeRates),
    fromCurrency,
    toCurrency,
  );
}

export function convertMoneyValue(
  value: MoneyValue,
  fromCurrency: string,
  toCurrency: string,
  exchangeRates: ExchangeRate[],
) {
  return convertMoneyValueWithLookup(
    value,
    fromCurrency,
    toCurrency,
    createExchangeRateLookup(exchangeRates),
  );
}

export function convertMoneyValueWithLookup(
  value: MoneyValue,
  fromCurrency: string,
  toCurrency: string,
  exchangeRateLookup: ExchangeRateLookup,
) {
  const rate = findExchangeRateInLookup(
    exchangeRateLookup,
    fromCurrency,
    toCurrency,
  );

  if (rate === null) {
    return null;
  }

  return toNumber(value) * rate;
}

export function summarizeAccounts(
  accounts: Account[],
  defaultCurrency: string,
  exchangeRates: ExchangeRate[],
) {
  return summarizeAccountsWithLookup(
    accounts,
    defaultCurrency,
    createExchangeRateLookup(exchangeRates),
  );
}

export function summarizeAccountsWithLookup(
  accounts: Account[],
  defaultCurrency: string,
  exchangeRateLookup: ExchangeRateLookup,
) {
  let grossTotal = 0;
  let netTotal = 0;
  let missingCount = 0;

  for (const account of accounts) {
    const convertedBalance = convertMoneyValueWithLookup(
      account.balance,
      account.currency,
      defaultCurrency,
      exchangeRateLookup,
    );

    if (convertedBalance === null) {
      missingCount += 1;
      continue;
    }

    netTotal += convertedBalance;

    if (convertedBalance >= 0) {
      grossTotal += convertedBalance;
    }
  }

  return { grossTotal, netTotal, missingCount };
}

export function createExchangeRateFormValues(
  currencies: string[],
  exchangeRates: ExchangeRate[],
) {
  const exchangeRateLookup = createExchangeRateLookup(exchangeRates);
  const values: Record<string, string> = {};

  for (const fromCurrency of currencies) {
    for (const toCurrency of currencies) {
      if (fromCurrency === toCurrency) {
        continue;
      }

      const rate = findExactExchangeRateInLookup(
        exchangeRateLookup,
        fromCurrency,
        toCurrency,
      );

      values[exchangeRateKey(fromCurrency, toCurrency)] =
        rate === null ? "" : formatExchangeRateValue(rate.rate);
    }
  }

  return values;
}

export function createExchangeRateManualValues(
  currencies: string[],
  exchangeRates: ExchangeRate[],
) {
  const exchangeRateLookup = createExchangeRateLookup(exchangeRates);
  const values: Record<string, boolean> = {};

  for (const fromCurrency of currencies) {
    for (const toCurrency of currencies) {
      if (fromCurrency === toCurrency) {
        continue;
      }

      values[exchangeRateKey(fromCurrency, toCurrency)] = Boolean(
        findExactExchangeRateInLookup(
          exchangeRateLookup,
          fromCurrency,
          toCurrency,
        )?.is_manual,
      );
    }
  }

  return values;
}

export function createExchangeRateAutoValues(
  currencies: string[],
  exchangeRates: ExchangeRate[],
) {
  const exchangeRateLookup = createExchangeRateLookup(exchangeRates);
  const values: Record<string, string> = {};

  for (const fromCurrency of currencies) {
    for (const toCurrency of currencies) {
      if (fromCurrency === toCurrency) {
        continue;
      }

      const rate = findExactExchangeRateInLookup(
        exchangeRateLookup,
        fromCurrency,
        toCurrency,
      );

      values[exchangeRateKey(fromCurrency, toCurrency)] =
        rate === null
          ? ""
          : formatExchangeRateValue(rate.provider_rate ?? rate.rate);
    }
  }

  return values;
}

export function readExchangeRateFormValue(
  values: Record<string, string>,
  fromCurrency: string,
  toCurrency: string,
) {
  return values[exchangeRateKey(fromCurrency, toCurrency)] ?? "";
}

export function writeExchangeRateFormValue(
  values: Record<string, string>,
  fromCurrency: string,
  toCurrency: string,
  nextValue: string,
) {
  return {
    ...values,
    [exchangeRateKey(fromCurrency, toCurrency)]: nextValue,
  };
}

export function readExchangeRateManualValue(
  values: Record<string, boolean>,
  fromCurrency: string,
  toCurrency: string,
) {
  return values[exchangeRateKey(fromCurrency, toCurrency)] ?? false;
}

export function writeExchangeRateManualValue(
  values: Record<string, boolean>,
  fromCurrency: string,
  toCurrency: string,
  nextValue: boolean,
) {
  return {
    ...values,
    [exchangeRateKey(fromCurrency, toCurrency)]: nextValue,
  };
}
