import Link from "next/link";

import { Card } from "@/components/ui";

const features = [
  {
    title: "Accounts",
    description: "Keep cash and bank balances separated without spreadsheet drift.",
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

const activity = [
  { label: "Salary", meta: "Income · Main account", amount: "+$4,200" },
  { label: "Groceries", meta: "Expense · Food", amount: "-$184" },
  { label: "Savings move", meta: "Transfer · Internal", amount: "$750" },
];

export default function LandingPage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      <nav className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex rounded-full border border-white/10 bg-ink/60 px-3 py-1.5 text-xs uppercase tracking-[0.28em] text-signal shadow-soft backdrop-blur transition hover:border-signal/40 hover:bg-signal/10 hover:text-white"
        >
          <span className="sm:hidden">MiniFT</span>
          <span className="hidden sm:inline">Mini Finance Tracker</span>
        </Link>

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
          <div className="rounded-[24px] border border-white/10 bg-ink/45 p-5 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-mist">
                  April overview
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Cash flow</h2>
              </div>
              <div className="rounded-full border border-signal/20 bg-signal/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-signal">
                Healthy
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[18px] border border-white/10 bg-white/[0.035] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-mist">
                  Income
                </p>
                <div className="mt-2 text-lg font-semibold text-signal">
                  $4,200
                </div>
              </div>
              <div className="rounded-[18px] border border-white/10 bg-white/[0.035] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-mist">
                  Expenses
                </p>
                <div className="mt-2 text-lg font-semibold text-hazard">
                  $1,845
                </div>
              </div>
              <div className="rounded-[18px] border border-white/10 bg-white/[0.035] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-mist">
                  Net
                </p>
                <div className="mt-2 text-lg font-semibold text-white">
                  $2,355
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-mist">Budget health</span>
                <span className="text-white">68% used</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[68%] rounded-full bg-signal" />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {activity.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-white">{item.label}</div>
                    <div className="mt-1 truncate text-xs text-mist">
                      {item.meta}
                    </div>
                  </div>
                  <div className="shrink-0 font-semibold text-white">
                    {item.amount}
                  </div>
                </div>
              ))}
            </div>
          </div>
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

      <footer className="px-4 pb-6 text-center text-sm text-mist">
        <p>
          Copyright © {new Date().getFullYear()} MiniFT. All rights reserved.
        </p>
        <p className="mt-2">
          Made by{" "}
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
    </main>
  );
}
