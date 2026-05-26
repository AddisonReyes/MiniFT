import Link from "next/link";

import { BrandLink } from "@/components/brand-link";
import { FinanceSnapshot } from "@/components/marketing/finance-snapshot";
import { NativeAppLandingGate } from "@/components/native-app-landing-gate";
import { SiteFooter } from "@/components/site-footer";
import { Card } from "@/components/ui";

const features = [
  {
    title: "Accounts",
    description:
      "Keep cash, bank, credit, and loan balances separated without spreadsheet drift.",
    bullets: [
      "Multiple account types in one place",
      "Track balances and transfers",
      "Full transaction history per account",
    ],
  },
  {
    title: "Budgets",
    description:
      "Set monthly category caps and track remaining spend in context.",
    bullets: [
      "Set monthly caps per category",
      "Track spend in real time",
      "Get warned before you overshoot",
    ],
  },
  {
    title: "Recurring",
    description:
      "Schedule repeated income and expenses so your month stays current.",
    bullets: [
      "Define rules once, apply every month",
      "Income, expenses, and transfers",
      "Keeps your baseline always up to date",
    ],
  },
  {
    title: "Reports",
    description:
      "Review income, expenses, net cash flow, and category concentration.",
    bullets: [
      "Monthly income vs. expense breakdown",
      "Category concentration view",
      "Net cash flow trend over time",
    ],
  },
];

const steps = [
  {
    number: "01",
    title: "Connect your accounts",
    description:
      "Add cash, bank, credit, or loan accounts. Set them up once and keep everything in one place.",
  },
  {
    number: "02",
    title: "Log your transactions",
    description:
      "Enter transactions manually or let recurring rules handle your fixed income and expenses automatically.",
  },
  {
    number: "03",
    title: "Read your month",
    description:
      "Check budgets, review reports, and see your net cash flow — all in one quiet, focused workspace.",
  },
];

export default function LandingPage() {
  return (
    <NativeAppLandingGate>
      <main className="mx-auto min-h-dvh w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        {/* Navbar */}
        <nav className="flex items-center justify-between gap-4">
          <BrandLink />

          <div className="flex items-center gap-2">
            <Link
              className="rounded-2xl px-4 py-2 text-sm text-mist transition hover:bg-white/[0.055] hover:text-white"
              href="/login"
            >
              Sign in
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-2xl bg-signal px-4 py-2 text-sm font-medium text-ink shadow-soft transition hover:bg-signal/90"
              href="/register"
            >
              Get started
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <section className="grid min-h-[calc(100dvh-5rem)] items-center gap-10 py-12 lg:grid-cols-[1.02fr_0.98fr] lg:py-16">
          <div className="space-y-8">
            <div className="space-y-5">
              <p className="text-xs uppercase tracking-[0.28em] text-signal">
                Focused personal finance
              </p>
              <h1 className="max-w-3xl text-5xl font-semibold leading-[0.95] sm:text-6xl lg:text-7xl">
                Your month, finally readable.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-mist sm:text-lg">
                MiniFT brings accounts, transactions, transfers, budgets,
                recurring entries, and reports into one quiet workspace built
                for monthly control.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex w-full items-center justify-center rounded-2xl bg-signal px-4 py-3 text-sm font-medium text-ink shadow-soft transition hover:bg-signal/90 sm:w-auto"
                href="/register"
              >
                Create your workspace
              </Link>
              <Link
                className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-sm font-medium text-white transition hover:border-white/15 hover:bg-white/10 sm:w-auto"
                href="/login"
              >
                Sign in
              </Link>
            </div>

            <div className="grid gap-3 text-sm text-mist sm:grid-cols-3">
              {[
                "No spreadsheet drift",
                "Monthly budget clarity",
                "Clean reports",
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
              How it works
            </p>
            <h2 className="text-3xl font-semibold">Three steps to clarity</h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.number} className="relative space-y-4">
                {/* Connector line between steps (desktop only) */}
                {i < steps.length - 1 && (
                  <div
                    className="absolute left-[calc(100%+1rem)] top-5 hidden h-px w-[calc(2rem-2px)] bg-white/10 md:block"
                    aria-hidden
                  />
                )}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-signal/30 bg-signal/10 text-sm font-semibold text-signal">
                    {step.number}
                  </div>
                  <h3 className="font-semibold">{step.title}</h3>
                </div>
                <p className="text-sm leading-6 text-mist">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Feature cards */}
        <section className="border-t border-white/[0.06] py-24">
          <div className="mb-14 space-y-2 text-center">
            <p className="text-xs uppercase tracking-[0.28em] text-signal">
              Features
            </p>
            <h2 className="text-3xl font-semibold">Everything you need, nothing you don&apos;t</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => (
              <Card
                key={feature.title}
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
            Get started
          </p>
          <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
            Ready to read your finances clearly?
          </h2>
          <p className="mt-3 text-base text-mist">
            Free to use. No card required.
          </p>
          <Link
            className="mt-8 inline-flex items-center justify-center rounded-2xl bg-signal px-6 py-3 text-sm font-medium text-ink shadow-soft transition hover:bg-signal/90"
            href="/register"
          >
            Create your workspace
          </Link>
        </section>

        <SiteFooter className="pb-6" />
      </main>
    </NativeAppLandingGate>
  );
}
