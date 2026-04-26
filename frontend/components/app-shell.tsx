"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/components/ui";

const navigation = [
  { href: "/", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/accounts", label: "Accounts" },
  { href: "/budgets", label: "Budgets" },
  { href: "/reports", label: "Reports" },
  { href: "/account", label: "Account" },
];

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-3 pb-0 pt-3 sm:px-6 sm:pt-6 lg:px-8">
      <header className="panel mb-5 overflow-hidden px-4 py-4 sm:mb-6 sm:px-5 sm:py-5">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.28em] text-signal transition hover:border-signal/40 hover:bg-signal/10 hover:text-white"
            onClick={() => setMobileNavOpen(false)}
          >
            <span className="sm:hidden">MiniFT</span>
            <span className="hidden sm:inline">Mini Finance Tracker</span>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {navigation.map((item) => {
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "whitespace-nowrap rounded-full px-4 py-2 text-sm transition",
                    active
                      ? "bg-white text-ink"
                      : "bg-white/5 text-mist hover:bg-white/10 hover:text-white",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10 md:hidden"
            type="button"
            aria-expanded={isMobileNavOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileNavOpen((current) => !current)}
          >
            <span className="sr-only">Toggle navigation</span>
            <span aria-hidden="true">{isMobileNavOpen ? "Close" : "Menu"}</span>
          </button>
        </div>

        <div
          id="mobile-navigation"
          className={cn(
            "mt-4 grid gap-2 md:hidden",
            isMobileNavOpen ? "grid" : "hidden",
          )}
        >
          {navigation.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={cn(
                  "flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition",
                  active
                    ? "border-signal/40 bg-signal/15 text-signal"
                    : "border-white/10 bg-white/[0.03] text-mist hover:bg-white/10 hover:text-white",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-5">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-mist">{description}</p>
          </div>
        </div>
      </header>

      {actions ? (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {actions}
        </div>
      ) : null}

      <main className="min-w-0 flex-1 pb-10">{children}</main>

      <footer className="mt-auto px-4 py-6 text-center text-sm text-mist">
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
    </div>
  );
}
