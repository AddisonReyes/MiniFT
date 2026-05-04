"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { FinanceSnapshot } from "@/components/marketing/finance-snapshot";
import { Card, Button, Input } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { login, sessionQueryKey, useSessionQuery } from "@/lib/auth";
import { sanitizeRedirectTarget } from "@/lib/redirect";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = sanitizeRedirectTarget(searchParams.get("next"));
  const queryClient = useQueryClient();
  const session = useSessionQuery();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
      router.replace(nextPath);
    },
  });

  useEffect(() => {
    if (session.data) {
      router.replace(nextPath);
    }
  }, [nextPath, router, session.data]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate({ email, password });
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid w-full gap-6 lg:grid-cols-[0.82fr_1.18fr]">
        <Card className="p-6 sm:p-8">
          <div className="mb-8 space-y-5">
            <div className="inline-flex rounded-full border border-white/10 bg-ink/45 px-4 py-2 text-xs uppercase tracking-[0.28em] text-signal">
              MiniFT
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold sm:text-4xl">
                Welcome back
              </h1>
              <p className="text-sm leading-6 text-mist">
                Sign in to continue managing accounts, budgets, and monthly
                cash flow.
              </p>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="email">Email</label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password">Password</label>
              <Input
                id="password"
                type="password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {mutation.error ? (
              <div className="rounded-2xl border border-hazard/20 bg-hazard/10 px-4 py-3 text-sm text-hazard">
                <div className="font-medium">Sign in failed</div>
                <p className="mt-1 text-hazard/90">
                  {mutation.error instanceof ApiError
                    ? mutation.error.message
                    : "Unable to sign in"}
                </p>
              </div>
            ) : null}

            <Button className="w-full" type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-mist">
            Need an account?{" "}
            <Link className="text-signal hover:text-signal/80" href="/register">
              Create one
            </Link>
          </p>
        </Card>

        <section className="panel hidden overflow-hidden p-8 lg:block lg:p-10">
          <div className="flex h-full flex-col justify-between gap-10">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.28em] text-signal">
                Personal finance workspace
              </p>
              <h2 className="max-w-xl text-4xl font-semibold">
                Your monthly finances, organized in one focused view.
              </h2>
              <p className="max-w-lg text-sm leading-6 text-mist">
                Keep balances, spending, budgets, transfers, and recurring
                activity close enough to understand your month at a glance.
              </p>
            </div>

            <FinanceSnapshot />

            <div className="grid gap-3 text-sm text-mist sm:grid-cols-4">
              {["Accounts", "Budgets", "Recurring", "Reports"].map((item) => (
                <div
                  key={item}
                  className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen" />}>
      <LoginPageContent />
    </Suspense>
  );
}
