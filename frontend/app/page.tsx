import Link from "next/link";

import { BrandLink } from "@/components/brand-link";
import { FinanceSnapshot } from "@/components/marketing/finance-snapshot";
import { SiteFooter } from "@/components/site-footer";
import { Card } from "@/components/ui";

const features = [
  {
    title: "Accounts",
    description: "Keep cash, bank, credit, and loan balances separated without spreadsheet drift.",
  },
  {
    title: "Budgets",
    description: "Set monthly category caps and track remaining spend in context.",
  },
  {
    title: "Recurring",
    description: "Schedule repeated income and expenses so your month stays current.",
  },
  {
    title: "Reports",
    description: "Review income, expenses, net cash flow, and category concentration.",
  },
];

export default function LandingPage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
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
              recurring entries, and reports into one quiet workspace built for
              monthly control.
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
            {["No spreadsheet drift", "Monthly budget clarity", "Clean reports"].map(
              (item) => (
                <div
                  key={item}
                  className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  {item}
                </div>
              ),
            )}
          </div>
        </div>

        <div className="panel p-4 sm:p-6">
          <FinanceSnapshot showActivity />
        </div>
      </section>

      <section className="grid gap-4 pb-16 md:grid-cols-2 xl:grid-cols-4">
        {features.map((feature) => (
          <Card
            key={feature.title}
            className="space-y-3 transition hover:border-white/15 hover:bg-white/[0.035]"
          >
            <h3 className="text-xl font-semibold">{feature.title}</h3>
            <p className="text-sm leading-6 text-mist">{feature.description}</p>
          </Card>
        ))}
      </section>

      <SiteFooter className="pb-6" />
    </main>
  );
}
