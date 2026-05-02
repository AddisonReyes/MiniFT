import { SUPPORTED_CURRENCIES } from "@/lib/constants";
import { toNumber } from "@/lib/format";
import type {
  Account,
  AccountType,
  ExchangeRate,
  MoneyValue,
} from "@/lib/types";

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

export function getTrackedCurrencies(
  accounts: Account[],
  defaultCurrency: string,
  exchangeRates: ExchangeRate[],
) {
  return Array.from(
    new Set([
      normalizeCurrencyCode(defaultCurrency),
      ...accounts.map((account) => normalizeCurrencyCode(account.currency)),
      ...exchangeRates.flatMap((rate) => [
        normalizeCurrencyCode(rate.from_currency),
        normalizeCurrencyCode(rate.to_currency),
      ]),
    ]),
  ).filter(Boolean);
}

function exchangeRateKey(fromCurrency: string, toCurrency: string) {
  return `${normalizeCurrencyCode(fromCurrency)}:${normalizeCurrencyCode(toCurrency)}`;
}

function createExchangeRateMap(exchangeRates: ExchangeRate[]) {
  return new Map(
    exchangeRates.map((rate) => [
      exchangeRateKey(rate.from_currency, rate.to_currency),
      toNumber(rate.rate),
    ]),
  );
}

function formatRateInputValue(value: number) {
  const normalized = value.toFixed(6).replace(/\.?0+$/, "");
  return normalized || "1";
}

export function findExchangeRate(
  exchangeRates: ExchangeRate[],
  fromCurrency: string,
  toCurrency: string,
) {
  const from = normalizeCurrencyCode(fromCurrency);
  const to = normalizeCurrencyCode(toCurrency);

  if (from === to) {
    return 1;
  }

  const rateMap = createExchangeRateMap(exchangeRates);
  const direct = rateMap.get(exchangeRateKey(from, to));

  if (typeof direct === "number" && Number.isFinite(direct) && direct > 0) {
    return direct;
  }

  const inverse = rateMap.get(exchangeRateKey(to, from));

  if (typeof inverse === "number" && Number.isFinite(inverse) && inverse > 0) {
    return 1 / inverse;
  }

  return null;
}

export function convertMoneyValue(
  value: MoneyValue,
  fromCurrency: string,
  toCurrency: string,
  exchangeRates: ExchangeRate[],
) {
  const rate = findExchangeRate(exchangeRates, fromCurrency, toCurrency);

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
  let grossTotal = 0;
  let netTotal = 0;
  let missingCount = 0;

  for (const account of accounts) {
    const convertedBalance = convertMoneyValue(
      account.balance,
      account.currency,
      defaultCurrency,
      exchangeRates,
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
  const values: Record<string, string> = {};

  for (const fromCurrency of currencies) {
    for (const toCurrency of currencies) {
      if (fromCurrency === toCurrency) {
        continue;
      }

      const rate = findExchangeRate(exchangeRates, fromCurrency, toCurrency);

      values[exchangeRateKey(fromCurrency, toCurrency)] =
        rate === null ? "" : formatRateInputValue(rate);
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
