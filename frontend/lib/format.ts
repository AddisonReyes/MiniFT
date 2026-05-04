import type { MoneyValue } from "@/lib/types";

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

function parseDateInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  return {
    year: Number.parseInt(year, 10),
    month: Number.parseInt(month, 10),
    day: Number.parseInt(day, 10),
  };
}

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
  const parsed = parseDateInput(value);

  if (!parsed) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(parsed.year, parsed.month - 1, parsed.day));
}

export function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function monthInputToDate(month: string): string {
  return `${month}-01`;
}

export function firstDayToMonthInput(date: string): string {
  return date.slice(0, 7);
}

export function currentDateInput(now = new Date()): string {
  return `${now.getFullYear()}-${padDatePart(now.getMonth() + 1)}-${padDatePart(now.getDate())}`;
}

export function currentMonthInput(now = new Date()): string {
  return firstDayToMonthInput(currentDateInput(now));
}
