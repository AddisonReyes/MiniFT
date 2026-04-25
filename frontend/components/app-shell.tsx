"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button, cn } from "@/components/ui";
import { logout, sessionQueryKey } from "@/lib/auth";
import type { User } from "@/lib/types";

const navigation = [
  { href: "/", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/accounts", label: "Accounts" },
  { href: "/budgets", label: "Budgets" },
  { href: "/reports", label: "Reports" },
];

export function AppShell({
  user,
  title,
  description,
  actions,
  children,
}: {
  user: User;
  title: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await queryClient.removeQueries({ queryKey: sessionQueryKey });
      router.replace("/login");
    },
  });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <header className="panel mb-6 overflow-hidden px-5 py-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.28em] text-signal">
              Mini Finance Tracker
            </div>
            <div>
              <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm text-mist">{description}</p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            <div className="text-right">
              <div className="font-mono text-xs uppercase tracking-[0.25em] text-mist">Signed In</div>
              <div className="mt-1 text-sm text-white">{user.email}</div>
            </div>
            <Button variant="ghost" onClick={() => logoutMutation.mutate()}>
              {logoutMutation.isPending ? "Signing out..." : "Sign out"}
            </Button>
          </div>
        </div>

        <nav className="mt-5 flex flex-wrap gap-2">
          {navigation.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm transition",
                  active ? "bg-white text-ink" : "bg-white/5 text-mist hover:bg-white/10 hover:text-white",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {actions ? <div className="mb-6 flex flex-wrap gap-3">{actions}</div> : null}

      <main className="flex-1">{children}</main>
    </div>
  );
}

