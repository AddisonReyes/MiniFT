"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Card, Button, Input } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { login, sessionQueryKey, useSessionQuery } from "@/lib/auth";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/";
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
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid w-full gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="panel overflow-hidden p-8 sm:p-10">
          <div className="max-w-xl space-y-6">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.28em] text-signal">
              MiniFT
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold sm:text-5xl">
                Track cash, accounts, budgets, and reports without the clutter.
              </h1>
              <p className="max-w-lg text-base text-mist">
                MiniFT keeps the first release tight: accounts, transactions, transfers,
                recurring entries, and monthly reporting in one dark, focused workspace.
              </p>
            </div>
            <div className="grid gap-4 text-sm text-mist sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                Multi-account balances
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                Category budgets
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                Monthly reporting
              </div>
            </div>
          </div>
        </section>

        <Card className="p-8">
          <div className="mb-8 space-y-2">
            <h2 className="text-3xl font-semibold">Sign in</h2>
            <p className="text-sm text-mist">Use your MiniFT account to continue.</p>
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
                required
              />
            </div>

            {mutation.error ? (
              <div className="rounded-2xl border border-hazard/20 bg-hazard/10 px-4 py-3 text-sm text-hazard">
                {mutation.error instanceof ApiError ? mutation.error.message : "Unable to sign in"}
              </div>
            ) : null}

            <Button className="w-full" type="submit">
              {mutation.isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-mist">
            Need an account?{" "}
            <Link className="text-signal hover:text-signal/80" href="/register">
              Register here
            </Link>
          </p>
        </Card>
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
