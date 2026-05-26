"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

import { BrandLink } from "@/components/brand-link";
import { FinanceSnapshot } from "@/components/marketing/finance-snapshot";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { NativeAppLandingGate } from "@/components/native-app-landing-gate";
import { SiteFooter } from "@/components/site-footer";
import { Card } from "@/components/ui";

export default function LandingPage() {
  const { t } = useTranslation();

  const features = [
    {
      key: "accounts",
      title: t("landing.features.accounts.title"),
      description: t("landing.features.accounts.description"),
      bullets: [
        t("landing.features.accounts.bullet1"),
        t("landing.features.accounts.bullet2"),
        t("landing.features.accounts.bullet3"),
      ],
    },
    {
      key: "budgets",
      title: t("landing.features.budgets.title"),
      description: t("landing.features.budgets.description"),
      bullets: [
        t("landing.features.budgets.bullet1"),
        t("landing.features.budgets.bullet2"),
        t("landing.features.budgets.bullet3"),
      ],
    },
    {
      key: "recurring",
      title: t("landing.features.recurring.title"),
      description: t("landing.features.recurring.description"),
      bullets: [
        t("landing.features.recurring.bullet1"),
        t("landing.features.recurring.bullet2"),
        t("landing.features.recurring.bullet3"),
      ],
    },
    {
      key: "reports",
      title: t("landing.features.reports.title"),
      description: t("landing.features.reports.description"),
      bullets: [
        t("landing.features.reports.bullet1"),
        t("landing.features.reports.bullet2"),
        t("landing.features.reports.bullet3"),
      ],
    },
  ];

  const steps = [
    {
      number: "01",
      title: t("landing.howItWorks.step1Title"),
      description: t("landing.howItWorks.step1Body"),
    },
    {
      number: "02",
      title: t("landing.howItWorks.step2Title"),
      description: t("landing.howItWorks.step2Body"),
    },
    {
      number: "03",
      title: t("landing.howItWorks.step3Title"),
      description: t("landing.howItWorks.step3Body"),
    },
  ];

  return (
    <NativeAppLandingGate>
      <main className="mx-auto min-h-dvh w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        {/* Navbar */}
        <nav className="flex items-center justify-between gap-4">
          <BrandLink />

          <div className="flex shrink-0 items-center gap-2">
            <Link
              className="whitespace-nowrap rounded-2xl px-5 py-2 text-sm text-mist transition hover:bg-white/[0.055] hover:text-white"
              href="/login"
            >
              {t("landing.nav.signIn")}
            </Link>
            <Link
              className="inline-flex min-w-max items-center justify-center whitespace-nowrap rounded-2xl bg-signal px-5 py-2 text-sm font-medium text-ink shadow-soft transition hover:bg-signal/90"
              href="/register"
            >
              {t("landing.nav.getStarted")}
            </Link>
            <LocaleSwitcher />
          </div>
        </nav>

        {/* Hero */}
        <section className="grid min-h-[calc(100dvh-5rem)] items-center gap-10 py-12 lg:grid-cols-[1.02fr_0.98fr] lg:py-16">
          <div className="space-y-8">
            <div className="space-y-5">
              <p className="text-xs uppercase tracking-[0.28em] text-signal">
                {t("landing.hero.eyebrow")}
              </p>
              <h1 className="max-w-3xl text-5xl font-semibold leading-[0.95] sm:text-6xl lg:text-7xl">
                {t("landing.hero.headline")}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-mist sm:text-lg">
                {t("landing.hero.body")}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex w-full items-center justify-center rounded-2xl bg-signal px-4 py-3 text-sm font-medium text-ink shadow-soft transition hover:bg-signal/90 sm:w-auto"
                href="/register"
              >
                {t("landing.hero.ctaPrimary")}
              </Link>
              <Link
                className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-sm font-medium text-white transition hover:border-white/15 hover:bg-white/10 sm:w-auto"
                href="/login"
              >
                {t("landing.hero.ctaSecondary")}
              </Link>
            </div>

            <div className="grid gap-3 text-sm text-mist sm:grid-cols-3">
              {[
                t("landing.hero.pill1"),
                t("landing.hero.pill2"),
                t("landing.hero.pill3"),
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-4 sm:p-6">
            <FinanceSnapshot showActivity />
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-white/[0.06] py-24">
          <div className="mb-14 space-y-2 text-center">
            <p className="text-xs uppercase tracking-[0.28em] text-signal">
              {t("landing.howItWorks.eyebrow")}
            </p>
            <h2 className="text-3xl font-semibold">
              {t("landing.howItWorks.headline")}
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="relative space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-signal/30 bg-signal/10 text-sm font-semibold text-signal">
                    {step.number}
                  </div>
                  <h3 className="font-semibold">{step.title}</h3>
                </div>
                <p className="text-sm leading-6 text-mist">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Feature cards */}
        <section className="border-t border-white/[0.06] py-24">
          <div className="mb-14 space-y-2 text-center">
            <p className="text-xs uppercase tracking-[0.28em] text-signal">
              {t("landing.features.eyebrow")}
            </p>
            <h2 className="text-3xl font-semibold">
              {t("landing.features.headline")}
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => (
              <Card
                key={feature.key}
                className="space-y-4 transition hover:border-white/15 hover:bg-white/[0.035]"
              >
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="text-sm leading-6 text-mist">
                    {feature.description}
                  </p>
                </div>
                <ul className="space-y-1.5">
                  {feature.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex items-start gap-2 text-xs text-mist"
                    >
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal/60"
                        aria-hidden
                      />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mb-24 rounded-[24px] border border-white/10 bg-background-elevated px-6 py-14 text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-signal">
            {t("landing.cta.eyebrow")}
          </p>
          <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
            {t("landing.cta.headline")}
          </h2>
          <p className="mt-3 text-base text-mist">{t("landing.cta.subtext")}</p>
          <Link
            className="mt-8 inline-flex items-center justify-center rounded-2xl bg-signal px-6 py-3 text-sm font-medium text-ink shadow-soft transition hover:bg-signal/90"
            href="/register"
          >
            {t("landing.cta.button")}
          </Link>
        </section>

        <SiteFooter className="pb-6" />
      </main>
    </NativeAppLandingGate>
  );
}
