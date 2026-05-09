"use client";

import type { SVGProps } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandLink } from "@/components/brand-link";
import { cn } from "@/components/ui";

type NavigationIcon =
  | "home"
  | "activity"
  | "accounts"
  | "budgets"
  | "reports"
  | "settings"
  | "more";

const navigation = [
  {
    href: "/dashboard",
    label: "Dashboard",
    section: "primary",
    icon: "home" as NavigationIcon,
  },
  {
    href: "/transactions",
    label: "Transactions",
    section: "primary",
    icon: "activity" as NavigationIcon,
  },
  {
    href: "/accounts",
    label: "Accounts",
    section: "primary",
    icon: "accounts" as NavigationIcon,
  },
  {
    href: "/budgets",
    label: "Budgets",
    section: "primary",
    icon: "budgets" as NavigationIcon,
  },
  {
    href: "/reports",
    label: "Reports",
    section: "secondary",
    icon: "reports" as NavigationIcon,
  },
  {
    href: "/settings",
    label: "Settings",
    section: "secondary",
    icon: "settings" as NavigationIcon,
  },
];

function NavIcon({
  icon,
  className,
}: {
  icon: NavigationIcon;
  className?: string;
}) {
  const props: SVGProps<SVGSVGElement> = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: cn("h-5 w-5", className),
    "aria-hidden": true,
  };

  switch (icon) {
    case "home":
      return (
        <svg {...props}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V20h14V9.5" />
          <path d="M9.5 20v-6h5v6" />
        </svg>
      );
    case "activity":
      return (
        <svg {...props}>
          <path d="M7 4v16" />
          <path d="m4 7 3-3 3 3" />
          <path d="M17 20V4" />
          <path d="m14 17 3 3 3-3" />
        </svg>
      );
    case "accounts":
      return (
        <svg {...props}>
          <rect x="3" y="6" width="18" height="12" rx="3" />
          <path d="M3 10h18" />
          <path d="M16.5 14h.01" />
        </svg>
      );
    case "budgets":
      return (
        <svg {...props}>
          <path d="M12 21a9 9 0 1 0-9-9" />
          <path d="M12 12V3" />
          <path d="m12 12 6.5 3.5" />
        </svg>
      );
    case "reports":
      return (
        <svg {...props}>
          <path d="M4 20V10" />
          <path d="M10 20V4" />
          <path d="M16 20v-7" />
          <path d="M22 20v-11" />
        </svg>
      );
    case "settings":
      return (
        <svg {...props}>
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h16" />
          <circle cx="9" cy="6" r="2" />
          <circle cx="15" cy="12" r="2" />
          <circle cx="11" cy="18" r="2" />
        </svg>
      );
    case "more":
      return (
        <svg {...props}>
          <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}

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
  const primaryNavigation = navigation.filter(
    (item) => item.section === "primary",
  );
  const secondaryNavigation = navigation.filter(
    (item) => item.section === "secondary",
  );
  const currentItem = navigation.find((item) => item.href === pathname);
  const isSecondaryRoute = secondaryNavigation.some(
    (item) => item.href === pathname,
  );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-3 pb-[calc(6.25rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-6 sm:pt-6 lg:px-8 xl:pb-0">
      <header className="mb-5 space-y-4 sm:mb-6 sm:space-y-5">
        <div className="flex items-center justify-between gap-3">
          <BrandLink
            href="/dashboard"
            onClick={() => setMobileNavOpen(false)}
          />

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
          <div className="inline-flex rounded-full border border-white/10 bg-ink/55 px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-mist shadow-soft backdrop-blur xl:hidden">
            {currentItem?.label ?? "Workspace"}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.24em] text-signal/80 sm:text-xs">
              Workspace
            </p>
            <h1 className="mt-1.5 text-[1.8rem] font-semibold leading-none sm:mt-2 sm:text-4xl">
              {title}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-5 text-mist sm:max-w-2xl sm:leading-6">
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

      <main className="min-w-0 flex-1 pb-4 sm:pb-6 xl:pb-10">{children}</main>

      {isMobileNavOpen ? (
        <>
          <button
            aria-label="Close more navigation"
            className="fixed inset-0 z-30 bg-ink/25 backdrop-blur-[1px] xl:hidden"
            type="button"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 px-3 xl:hidden">
            <div
              id="mobile-navigation"
              className="mx-auto grid max-w-md gap-2 rounded-[24px] border border-white/10 bg-ink/92 p-2 shadow-panel backdrop-blur-xl"
            >
              {secondaryNavigation.map((item) => {
                const active = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={cn(
                      "flex min-h-12 items-center justify-between rounded-2xl border px-4 py-3 text-sm transition",
                      active
                        ? "border-signal/40 bg-signal/15 text-signal"
                        : "border-white/10 bg-white/[0.03] text-mist hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <NavIcon icon={item.icon} className="h-[18px] w-[18px]" />
                      <span>{item.label}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[rgba(9,12,17,0.92)] backdrop-blur-xl xl:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-5 gap-2 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2">
          {primaryNavigation.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className={cn(
                  "flex min-h-12 items-center justify-center rounded-[18px] px-2 py-2 transition",
                  active
                    ? "bg-white text-ink shadow-sm"
                    : "text-mist hover:bg-white/[0.06] hover:text-white",
                )}
              >
                <span className="sr-only">{item.label}</span>
                <NavIcon icon={item.icon} />
              </Link>
            );
          })}
          <button
            aria-controls="mobile-navigation"
            aria-expanded={isMobileNavOpen}
            aria-label={isMobileNavOpen ? "Close more navigation" : "Open more navigation"}
            className={cn(
              "flex min-h-12 items-center justify-center rounded-[18px] px-2 py-2 transition",
              isMobileNavOpen || isSecondaryRoute
                ? "bg-white text-ink shadow-sm"
                : "text-mist hover:bg-white/[0.06] hover:text-white",
            )}
            type="button"
            onClick={() => setMobileNavOpen((current) => !current)}
          >
            <span className="sr-only">
              {isMobileNavOpen ? "Close more navigation" : "Open more navigation"}
            </span>
            <NavIcon icon="more" />
          </button>
        </div>
      </nav>
    </div>
  );
}
