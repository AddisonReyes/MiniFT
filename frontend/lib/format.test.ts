import { describe, expect, it } from "vitest";

import {
  currentDateInput,
  currentMonthInput,
  firstDayToMonthInput,
  formatCurrency,
  formatDate,
  formatDateTime,
  monthInputToDate,
  toNumber,
} from "@/lib/format";

describe("format helpers", () => {
  it("normalizes money values to numbers", () => {
    expect(toNumber(12.5)).toBe(12.5);
    expect(toNumber("42.75")).toBe(42.75);
    expect(toNumber("not-a-number")).toBe(0);
  });

  it("formats currency with two decimals", () => {
    expect(formatCurrency("1234.5", "USD")).toBe("$1,234.50");
    expect(formatCurrency(2500, "DOP")).toBe("DOP\u00a02,500.00");
  });

  it("formats date inputs without timezone drift", () => {
    expect(formatDate("2026-05-04")).toBe("May 4, 2026");
    expect(formatDate("invalid-date")).toBe("invalid-date");
  });

  it("formats date-time inputs and preserves invalid values", () => {
    expect(formatDateTime("invalid-date-time")).toBe("invalid-date-time");
    expect(formatDateTime("2026-05-04T13:30:00Z")).toContain("2026");
  });

  it("converts between month and first-day date inputs", () => {
    expect(monthInputToDate("2026-05")).toBe("2026-05-01");
    expect(firstDayToMonthInput("2026-05-01")).toBe("2026-05");
  });

  it("builds current date and month inputs from an injected date", () => {
    const now = new Date(2026, 4, 9);

    expect(currentDateInput(now)).toBe("2026-05-09");
    expect(currentMonthInput(now)).toBe("2026-05");
  });
});
