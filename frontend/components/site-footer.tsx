"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

type FooterLink = {
  href: string;
  label: string;
  external?: boolean;
};

function FooterLinkList({ links }: { links: FooterLink[] }) {
  return (
    <ul className="mt-4 space-y-2.5 text-sm text-mist">
      {links.map((link) => (
        <li key={link.href}>
          {link.external ? (
            <a
              className="transition hover:text-white focus:outline-none focus:ring-2 focus:ring-signal/40"
              href={link.href}
              target="_blank"
              rel="noreferrer"
            >
              {link.label}
            </a>
          ) : (
            <Link
              className="transition hover:text-white focus:outline-none focus:ring-2 focus:ring-signal/40"
              href={link.href}
            >
              {link.label}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

export function SiteFooter({
  className = "",
  landingLinks = [],
}: {
  className?: string;
  landingLinks?: FooterLink[];
}) {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  const apiDocsUrl = `${(
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api"
  )
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "")}/docs`;
  const productLinks = landingLinks.length
    ? landingLinks
    : [{ href: "/", label: t("footer.home") }];
  const trustLinks = [
    { href: "/privacy", label: t("footer.privacy") },
    { href: "/terms", label: t("footer.terms") },
    { href: "/cookies", label: t("footer.cookies") },
  ];
  const developerLinks = [
    {
      href: "https://github.com/AddisonReyes/MiniFT",
      label: t("footer.sourceCode"),
      external: true,
    },
    { href: apiDocsUrl, label: t("footer.apiDocs"), external: true },
  ];

  return (
    <footer
      className={`border-t border-white/[0.06] px-1 py-10 text-sm text-mist ${className}`}
    >
      <div className="grid gap-8 rounded-[24px] border border-white/10 bg-white/[0.025] p-5 sm:p-6 lg:grid-cols-[1.25fr_0.85fr_0.85fr_0.9fr]">
        <div>
          <div className="text-xs uppercase tracking-[0.28em] text-signal">
            {t("brand.name")}
          </div>
          <p className="mt-4 max-w-sm text-sm leading-6 text-mist">
            {t("footer.description")}
          </p>
          <p className="mt-5 text-xs text-mist/80">
            {t("footer.copyright", { year })}
          </p>
        </div>

        <nav aria-label={t("footer.product")}>
          <h2 className="text-sm font-semibold text-white">
            {t("footer.product")}
          </h2>
          <FooterLinkList links={productLinks} />
        </nav>

        <nav aria-label={t("footer.trust")}>
          <h2 className="text-sm font-semibold text-white">{t("footer.trust")}</h2>
          <FooterLinkList links={trustLinks} />
        </nav>

        <nav aria-label={t("footer.developers")}>
          <h2 className="text-sm font-semibold text-white">
            {t("footer.developers")}
          </h2>
          <FooterLinkList links={developerLinks} />
        </nav>
      </div>

      <div className="flex flex-col gap-2 px-2 py-5 text-center text-xs text-mist sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <span>{t("footer.tagline")}</span>
        <span>
          {t("footer.madeBy")} {" "}
          <a
            className="text-signal transition hover:text-white focus:outline-none focus:ring-2 focus:ring-signal/40"
            href="https://addisonreyes.com"
            target="_blank"
            rel="noreferrer"
          >
            Addison Reyes
          </a>
        </span>
      </div>
    </footer>
  );
}
