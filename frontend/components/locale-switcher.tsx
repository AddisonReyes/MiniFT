"use client";

import { useTranslation } from "react-i18next";

const LOCALES = [
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
] as const;

type LocaleCode = (typeof LOCALES)[number]["code"];

export function LocaleSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation();
  const current = (i18n.language?.slice(0, 2) ?? "en") as LocaleCode;

  function handleChange(code: LocaleCode) {
    void i18n.changeLanguage(code);
  }

  return (
    <div
      className={`flex items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.03] p-0.5 ${className ?? ""}`}
      role="group"
      aria-label="Language"
    >
      {LOCALES.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => handleChange(code)}
          aria-pressed={current === code}
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
            current === code
              ? "bg-white/10 text-white"
              : "text-mist hover:text-white"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
