"use client";

import { useTranslation } from "react-i18next";

export function SiteFooter({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className={`px-4 py-6 text-center text-sm text-mist ${className}`}>
      <p>{t("footer.copyright", { year })}</p>
      <p className="mt-2">
        {t("footer.madeBy")}{" "}
        <a
          className="text-signal transition hover:text-white"
          href="https://addisonreyes.com"
          target="_blank"
          rel="noreferrer"
        >
          Addison Reyes
        </a>
      </p>
    </footer>
  );
}
