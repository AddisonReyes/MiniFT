"use client";

import { ReactNode } from "react";

import { BrandLink } from "@/components/brand-link";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SiteFooter } from "@/components/site-footer";

export type LegalSection = {
  title: string;
  body: ReactNode[];
};

export function LegalPage({
  title,
  eyebrow,
  effectiveDate,
  intro,
  sections,
}: {
  title: string;
  eyebrow: string;
  effectiveDate: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-5xl px-4 py-5 sm:px-6 lg:px-8">
      <nav className="flex items-center justify-between gap-4">
        <BrandLink />
        <LocaleSwitcher />
      </nav>

      <header className="py-16 sm:py-20">
        <p className="text-xs uppercase tracking-[0.28em] text-signal">
          {eyebrow}
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 text-sm uppercase tracking-[0.18em] text-mist">
          {effectiveDate}
        </p>
        <p className="mt-6 max-w-3xl text-base leading-7 text-mist sm:text-lg">
          {intro}
        </p>
      </header>

      <section className="space-y-4">
        {sections.map((section) => (
          <article key={section.title} className="panel p-5 sm:p-6">
            <h2 className="text-xl font-semibold sm:text-2xl">
              {section.title}
            </h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-mist sm:text-base">
              {section.body.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </article>
        ))}
      </section>

      <SiteFooter className="mt-10 pb-6" />
    </main>
  );
}
