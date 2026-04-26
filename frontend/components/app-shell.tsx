"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/components/ui";

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/accounts", label: "Accounts" },
  { href: "/budgets", label: "Budgets" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
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
      <header className="mb-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="inline-flex shrink-0 rounded-full border border-white/10 bg-ink/60 px-3 py-1.5 text-xs uppercase tracking-[0.28em] text-signal shadow-soft backdrop-blur transition hover:border-signal/40 hover:bg-signal/10 hover:text-white"
            onClick={() => setMobileNavOpen(false)}
          >
            <span className="sm:hidden">MiniFT</span>
            <span className="hidden sm:inline">Mini Finance Tracker</span>
          </Link>

          <nav className="hidden rounded-full border border-white/10 bg-ink/55 p-1 shadow-soft backdrop-blur xl:flex xl:items-center xl:gap-1">
            {navigation.map((item) => {
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "whitespace-nowrap rounded-full px-3 py-2 text-sm transition lg:px-4",
                    active
                      ? "bg-white text-ink shadow-sm"
                      : "text-mist hover:bg-white/[0.06] hover:text-white",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-ink/60 px-3 py-2 text-sm font-medium text-white shadow-soft backdrop-blur transition hover:bg-white/10 xl:hidden"
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
            "grid gap-2 overflow-hidden rounded-[22px] border border-white/10 bg-ink/85 p-2 shadow-soft backdrop-blur xl:hidden",
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

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.24em] text-signal/80">
              Workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-mist">
              {description}
            </p>
          </div>

          {actions ? (
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
              {actions}
            </div>
          ) : null}
        </div>
      </header>

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
