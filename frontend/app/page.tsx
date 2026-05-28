"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { BrandLink } from "@/components/brand-link";
import { FinanceSnapshot } from "@/components/marketing/finance-snapshot";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { NativeAppLandingGate } from "@/components/native-app-landing-gate";
import { SiteFooter } from "@/components/site-footer";
import { Card, cn } from "@/components/ui";

type LandingLink = {
  href: string;
  label: string;
};

function LandingNav({ links }: { links: LandingLink[] }) {
  const { t } = useTranslation();
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isNavHidden, setNavHidden] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;

    function handleScroll() {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollYRef.current;
      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;

      if (isDesktop || isMenuOpen || currentScrollY < 80) {
        setNavHidden(false);
        lastScrollYRef.current = currentScrollY;
        return;
      }

      if (Math.abs(scrollDelta) < 8) {
        return;
      }

      setNavHidden(scrollDelta > 0);
      lastScrollYRef.current = currentScrollY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isMenuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header
      className={cn(
        "fixed inset-x-3 top-3 z-40 max-w-[calc(100vw-1.5rem)] transition-[transform,opacity] duration-200 sm:inset-x-6 sm:max-w-[calc(100vw-3rem)] lg:sticky lg:inset-x-auto lg:max-w-none lg:translate-y-0 lg:opacity-100",
        isNavHidden
          ? "-translate-y-[calc(100%+1rem)] opacity-0"
          : "translate-y-0 opacity-100",
      )}
    >
      <nav
        className="min-w-0 overflow-hidden rounded-[24px] border border-white/10 bg-ink/78 px-3 py-3 shadow-soft backdrop-blur-xl sm:px-4"
        aria-label={t("landing.nav.ariaLabel")}
      >
        <div className="flex min-w-0 items-center justify-between gap-2 sm:gap-3">
          <BrandLink href="#home" onClick={closeMenu} />

          <div className="hidden items-center gap-1 lg:flex">
            {links.map((link) => (
              <a
                key={link.href}
                className="rounded-2xl px-3 py-2 text-sm text-mist transition hover:bg-white/[0.055] hover:text-white focus:outline-none focus:ring-2 focus:ring-signal/40"
                href={link.href}
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
            <Link
              className="hidden whitespace-nowrap rounded-2xl px-4 py-2 text-sm text-mist transition hover:bg-white/[0.055] hover:text-white focus:outline-none focus:ring-2 focus:ring-signal/40 sm:inline-flex"
              href="/login"
            >
              {t("landing.nav.signIn")}
            </Link>
            <Link
              className="inline-flex min-w-0 items-center justify-center whitespace-nowrap rounded-2xl bg-signal px-3 py-2 text-sm font-medium text-ink shadow-soft transition hover:bg-signal/90 focus:outline-none focus:ring-2 focus:ring-signal/40 focus:ring-offset-2 focus:ring-offset-ink sm:px-4"
              href="/register"
            >
              {t("landing.nav.getStarted")}
            </Link>
            <div className="hidden sm:block">
              <LocaleSwitcher />
            </div>
            <button
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] px-3 text-sm text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-signal/40 lg:hidden"
              type="button"
              aria-expanded={isMenuOpen}
              aria-controls="landing-mobile-menu"
              onClick={() => setMenuOpen((current) => !current)}
            >
              {isMenuOpen ? t("landing.nav.close") : t("landing.nav.menu")}
            </button>
          </div>
        </div>

        <div
          id="landing-mobile-menu"
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-200 lg:hidden",
            isMenuOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="overflow-hidden">
            <div className="mt-3 grid gap-2 border-t border-white/10 pt-3">
              {links.map((link) => (
                <a
                  key={link.href}
                  className="rounded-2xl px-3 py-3 text-sm text-mist transition hover:bg-white/[0.055] hover:text-white focus:outline-none focus:ring-2 focus:ring-signal/40"
                  href={link.href}
                  onClick={closeMenu}
                >
                  {link.label}
                </a>
              ))}
              <div className="grid grid-cols-2 gap-2 pt-1 sm:hidden">
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] px-3 text-sm font-medium text-white"
                  href="/login"
                  onClick={closeMenu}
                >
                  {t("landing.nav.signIn")}
                </Link>
                <LocaleSwitcher />
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  centered?: boolean;
}) {
  return (
    <div className={cn("mb-10 space-y-3", centered && "text-center")}> 
      <p className="text-xs uppercase tracking-[0.28em] text-signal">{eyebrow}</p>
      <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">{title}</h2>
      {description ? (
        <p className={cn("text-sm leading-6 text-mist sm:text-base", centered ? "mx-auto max-w-2xl" : "max-w-2xl")}>
          {description}
        </p>
      ) : null}
    </div>
  );
}

export default function LandingPage() {
  const { t } = useTranslation();

  const navLinks = [
    { href: "#home", label: t("landing.nav.home") },
    { href: "#value", label: t("landing.nav.value") },
    { href: "#how-it-works", label: t("landing.nav.howItWorks") },
    { href: "#features", label: t("landing.nav.features") },
    { href: "#faq", label: t("landing.nav.faq") },
  ];

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

  const valueCards = [
    {
      title: t("landing.value.month.title"),
      description: t("landing.value.month.description"),
      metric: t("landing.value.month.metric"),
    },
    {
      title: t("landing.value.spreadsheets.title"),
      description: t("landing.value.spreadsheets.description"),
      metric: t("landing.value.spreadsheets.metric"),
    },
    {
      title: t("landing.value.review.title"),
      description: t("landing.value.review.description"),
      metric: t("landing.value.review.metric"),
    },
  ];

  const trustItems = [
    t("landing.trust.noBankCredentials"),
    t("landing.trust.gmailReadonly"),
    t("landing.trust.monthlyClarity"),
  ];

  const faqs = [
    {
      question: t("landing.faq.free.question"),
      answer: t("landing.faq.free.answer"),
    },
    {
      question: t("landing.faq.bank.question"),
      answer: t("landing.faq.bank.answer"),
    },
    {
      question: t("landing.faq.manual.question"),
      answer: t("landing.faq.manual.answer"),
    },
    {
      question: t("landing.faq.gmail.question"),
      answer: t("landing.faq.gmail.answer"),
    },
    {
      question: t("landing.faq.data.question"),
      answer: t("landing.faq.data.answer"),
    },
    {
      question: t("landing.faq.mobile.question"),
      answer: t("landing.faq.mobile.answer"),
    },
  ];

  return (
    <NativeAppLandingGate>
      <main className="mx-auto min-h-dvh w-full max-w-7xl overflow-hidden px-3 pb-3 pt-24 sm:px-6 lg:px-8 lg:py-3">
        <LandingNav links={navLinks} />

        <section
          id="home"
          className="grid min-w-0 scroll-mt-28 items-center gap-10 py-14 sm:py-18 lg:min-h-[calc(100dvh-6rem)] lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:py-20"
        >
          <div className="min-w-0 space-y-8">
            <div className="space-y-5">
              <div className="inline-flex max-w-full rounded-full border border-signal/20 bg-signal/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-signal [overflow-wrap:anywhere] sm:tracking-[0.22em]">
                {t("landing.hero.eyebrow")}
              </div>
              <h1 className="max-w-3xl text-4xl font-semibold leading-[0.96] [overflow-wrap:anywhere] sm:text-6xl lg:text-7xl">
                {t("landing.hero.headline")}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-mist [overflow-wrap:anywhere] sm:text-lg">
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

            <div className="grid min-w-0 gap-3 text-sm text-mist sm:grid-cols-3">
              {trustItems.map((item) => (
                <div
                  key={item}
                  className="min-w-0 rounded-[18px] border border-white/10 bg-white/[0.035] px-4 py-3 [overflow-wrap:anywhere]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="panel min-w-0 max-w-full overflow-hidden p-3 sm:p-6">
            <FinanceSnapshot showActivity />
          </div>
        </section>

        <section id="value" className="scroll-mt-28 border-t border-white/[0.06] py-20 sm:py-24">
          <SectionHeader
            eyebrow={t("landing.value.eyebrow")}
            title={t("landing.value.headline")}
            description={t("landing.value.description")}
            centered
          />

          <div className="grid gap-4 md:grid-cols-3">
            {valueCards.map((card) => (
              <Card key={card.title} className="space-y-5 transition hover:border-white/15 hover:bg-white/[0.035]">
                <div className="text-xs uppercase tracking-[0.22em] text-signal/80">
                  {card.metric}
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">{card.title}</h3>
                  <p className="text-sm leading-6 text-mist">{card.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-28 border-t border-white/[0.06] py-20 sm:py-24">
          <SectionHeader
            eyebrow={t("landing.howItWorks.eyebrow")}
            title={t("landing.howItWorks.headline")}
            description={t("landing.howItWorks.description")}
            centered
          />

          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <Card key={step.number} className="relative space-y-4 bg-white/[0.025]">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-signal/30 bg-signal/10 text-sm font-semibold text-signal">
                    {step.number}
                  </div>
                  <h3 className="font-semibold">{step.title}</h3>
                </div>
                <p className="text-sm leading-6 text-mist">
                  {step.description}
                </p>
              </Card>
            ))}
          </div>
        </section>

        <section id="features" className="scroll-mt-28 border-t border-white/[0.06] py-20 sm:py-24">
          <SectionHeader
            eyebrow={t("landing.features.eyebrow")}
            title={t("landing.features.headline")}
            description={t("landing.features.description")}
            centered
          />

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

        <section id="faq" className="scroll-mt-28 border-t border-white/[0.06] py-20 sm:py-24">
          <SectionHeader
            eyebrow={t("landing.faq.eyebrow")}
            title={t("landing.faq.headline")}
            description={t("landing.faq.description")}
            centered
          />

          <div className="mx-auto grid max-w-4xl gap-3">
            {faqs.map((item) => (
              <details
                key={item.question}
                className="group rounded-[22px] border border-white/10 bg-white/[0.03] p-5 transition open:bg-white/[0.045]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-medium text-white focus:outline-none focus:ring-2 focus:ring-signal/40">
                  <span>{item.question}</span>
                  <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-sm text-mist transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-4 text-sm leading-6 text-mist">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

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

        <SiteFooter className="pb-6" landingLinks={navLinks} />
      </main>
    </NativeAppLandingGate>
  );
}
