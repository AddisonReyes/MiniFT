"use client";

import { Select } from "@/components/ui";
import { currentMonthInput } from "@/lib/format";

const months = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

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
  const { year, month } = parseMonthValue(value);
  const years = createYearOptions(year);

  return (
    <div className={className}>
      <div className="grid grid-cols-[1.15fr_0.85fr] gap-3">
        <Select
          aria-label="Month"
          value={month}
          onChange={(event) => onChange(`${year}-${event.target.value}`)}
        >
          {months.map((monthOption) => (
            <option key={monthOption.value} value={monthOption.value}>
              {monthOption.label}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Year"
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
