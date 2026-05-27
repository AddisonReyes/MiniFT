"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

export function SiteFooter({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  const apiDocsUrl = `${(
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api"
  )
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "")}/docs`;
  const links = [
    { href: "/privacy", label: t("footer.privacy") },
    { href: "/terms", label: t("footer.terms") },
    { href: "/cookies", label: t("footer.cookies") },
    {
      href: "https://github.com/AddisonReyes/MiniFT",
      label: t("footer.sourceCode"),
      external: true,
    },
    { href: apiDocsUrl, label: t("footer.apiDocs"), external: true },
  ];

  return (
    <footer className={`px-4 py-6 text-center text-sm text-mist ${className}`}>
      <nav className="mb-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        {links.map((link) =>
          link.external ? (
            <a
              key={link.href}
              className="transition hover:text-white"
              href={link.href}
              target="_blank"
              rel="noreferrer"
            >
              {link.label}
            </a>
          ) : (
            <Link
              key={link.href}
              className="transition hover:text-white"
              href={link.href}
            >
              {link.label}
            </Link>
          ),
        )}
      </nav>
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
