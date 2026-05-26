"use client";

import { useTranslation } from "react-i18next";

import { Select } from "@/components/ui";
import { currentMonthInput } from "@/lib/format";

const MONTH_VALUES = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"] as const;

function parseMonthValue(value: string) {
  const normalizedValue = /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
    ? value
    : currentMonthInput();
  const [year, month] = normalizedValue.split("-");

  return { year, month };
}

function createYearOptions(selectedYear: string) {
  const currentYear = new Date().getFullYear();
  const selected = Number(selectedYear);
  const years = new Set<number>();

  for (let year = currentYear - 5; year <= currentYear + 5; year += 1) {
    years.add(year);
  }

  if (!Number.isNaN(selected)) {
    years.add(selected);
  }

  return Array.from(years).sort((first, second) => second - first);
}

export function MonthPicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const { year, month } = parseMonthValue(value);
  const years = createYearOptions(year);

  return (
    <div className={className}>
      <div className="grid grid-cols-[1.15fr_0.85fr] gap-3">
        <Select
          aria-label={t("budgets.month")}
          value={month}
          onChange={(event) => onChange(`${year}-${event.target.value}`)}
        >
          {MONTH_VALUES.map((m) => (
            <option key={m} value={m}>
              {t(`months.${m}`)}
            </option>
          ))}
        </Select>

        <Select
          aria-label={t("common.year")}
          value={year}
          onChange={(event) => onChange(`${event.target.value}-${month}`)}
        >
          {years.map((yearOption) => (
            <option key={yearOption} value={yearOption}>
              {yearOption}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
