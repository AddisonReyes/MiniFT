"use client";

import { useTranslation } from "react-i18next";

import { Select } from "@/components/ui";

const LOCALES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
] as const;

const LOCALE_STORAGE_KEY = "minift_locale";

type LocaleCode = (typeof LOCALES)[number]["code"];

export function LocaleSwitcher({ className }: { className?: string }) {
  const { i18n, t } = useTranslation();
  const current = (i18n.language?.slice(0, 2) ?? "en") as LocaleCode;

  function handleChange(code: string) {
    if (!LOCALES.some((locale) => locale.code === code)) {
      return;
    }

    window.localStorage.setItem(LOCALE_STORAGE_KEY, code);
    void i18n.changeLanguage(code);
  }

  return (
    <Select
      className={className}
      aria-label={t("common.language")}
      value={current}
      onChange={(event) => handleChange(event.target.value)}
    >
      {LOCALES.map(({ code, label }) => (
        <option key={code} value={code}>
          {label}
        </option>
      ))}
    </Select>
  );
}
