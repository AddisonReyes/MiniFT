import type { MoneyValue } from "@/lib/types";

export function toNumber(value: MoneyValue): number {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function formatCurrency(value: MoneyValue, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function monthInputToDate(month: string): string {
  return `${month}-01`;
}

export function firstDayToMonthInput(date: string): string {
  return date.slice(0, 7);
}

export function currentMonthInput(): string {
  return firstDayToMonthInput(new Date().toISOString().slice(0, 10));
}
