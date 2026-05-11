"use client";

import type { SVGProps } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandLink } from "@/components/brand-link";
import { cn } from "@/components/ui";
import { isNativeAppShell } from "@/lib/platform";

type NavigationIcon =
  | "home"
  | "activity"
  | "accounts"
  | "budgets"
  | "imports"
  | "reports"
  | "settings"
  | "menu"
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
    href: "/imports",
    label: "Imports",
    section: "secondary",
    icon: "imports" as NavigationIcon,
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
    case "imports":
      return (
        <svg {...props}>
          <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" />
          <path d="M8 10h8" />
          <path d="m12 10 3.5 3.5" />
          <path d="M12 10 8.5 13.5" />
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
    case "menu":
      return (
        <svg {...props}>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M10 17h10" />
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
  const [isCompactWebNavOpen, setCompactWebNavOpen] = useState(false);
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
  const showNativeMobileNavigation = isNativeAppShell();

  return (
    <div
      className={cn(
        "mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-6 sm:pt-6 lg:px-8",
        showNativeMobileNavigation
          ? "pb-[calc(6.25rem+env(safe-area-inset-bottom))] lg:pb-0"
          : "pb-0",
      )}
    >
      <header className="mb-5 space-y-4 sm:mb-6 sm:space-y-5">
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <BrandLink
              href="/dashboard"
              onClick={() => {
                setMobileNavOpen(false);
                setCompactWebNavOpen(false);
              }}
            />

            <nav
              className={cn(
                "hidden rounded-full border border-white/10 bg-ink/55 p-1 shadow-soft backdrop-blur lg:flex lg:items-center lg:gap-1",
                !showNativeMobileNavigation && "ml-auto",
              )}
            >
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

            {showNativeMobileNavigation ? (
              <div className="inline-flex rounded-full border border-white/10 bg-ink/55 px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-mist shadow-soft backdrop-blur lg:hidden">
                {currentItem?.label ?? "Workspace"}
              </div>
            ) : (
              <button
                aria-controls="compact-web-navigation"
                aria-expanded={isCompactWebNavOpen}
                aria-label={
                  isCompactWebNavOpen
                    ? "Close navigation menu"
                    : "Open navigation menu"
                }
                className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-ink/55 px-4 py-2 text-sm text-mist shadow-soft backdrop-blur transition hover:border-white/15 hover:bg-white/[0.06] hover:text-white lg:hidden"
                type="button"
                onClick={() => setCompactWebNavOpen((current) => !current)}
              >
                <NavIcon icon="menu" className="h-[18px] w-[18px]" />
                <span>Menu</span>
              </button>
            )}
          </div>

          {!showNativeMobileNavigation && isCompactWebNavOpen ? (
            <>
              <button
                aria-label="Close navigation menu"
                className="fixed inset-0 z-30 bg-ink/20 backdrop-blur-[1px] lg:hidden"
                type="button"
                onClick={() => setCompactWebNavOpen(false)}
              />
              <div className="absolute right-0 top-[calc(100%+0.75rem)] z-40 w-full max-w-[19rem] lg:hidden">
                <div
                  id="compact-web-navigation"
                  className="grid gap-2 rounded-[24px] border border-white/10 bg-ink/94 p-2 shadow-panel backdrop-blur-xl"
                >
                  {navigation.map((item) => {
                    const active = pathname === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setCompactWebNavOpen(false)}
                        className={cn(
                          "flex min-h-12 items-center justify-between rounded-[18px] border px-4 py-3 text-sm transition",
                          active
                            ? "border-white/20 bg-white text-ink shadow-sm"
                            : "border-white/10 bg-white/[0.03] text-mist hover:bg-white/[0.08] hover:text-white",
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <NavIcon
                            icon={item.icon}
                            className="h-[18px] w-[18px]"
                          />
                          <span>{item.label}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}
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

      <main className="min-w-0 flex-1 pb-4 sm:pb-6 lg:pb-10">{children}</main>

      {showNativeMobileNavigation && isMobileNavOpen ? (
        <>
          <button
            aria-label="Close more navigation"
            className="fixed inset-0 z-30 bg-ink/25 backdrop-blur-[1px] lg:hidden"
            type="button"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 px-3 lg:hidden">
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

      {showNativeMobileNavigation ? (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[rgba(9,12,17,0.92)] backdrop-blur-xl lg:hidden">
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
              aria-label={
                isMobileNavOpen
                  ? "Close more navigation"
                  : "Open more navigation"
              }
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
                {isMobileNavOpen
                  ? "Close more navigation"
                  : "Open more navigation"}
              </span>
              <NavIcon icon="more" />
            </button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
