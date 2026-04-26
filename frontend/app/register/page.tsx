"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Card, Button, Input, Select } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { register, sessionQueryKey, useSessionQuery } from "@/lib/auth";

const currencies = ["USD", "EUR", "DOP", "GBP", "CAD"];

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";
  const queryClient = useQueryClient();
  const session = useSessionQuery();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currency, setCurrency] = useState("USD");

  const mutation = useMutation({
    mutationFn: register,
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
    mutation.mutate({ email, password, currency });
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid w-full gap-6 lg:grid-cols-[0.86fr_1.14fr]">
        <Card className="p-6 sm:p-8">
          <div className="mb-8 space-y-5">
            <div className="inline-flex rounded-full border border-white/10 bg-ink/45 px-4 py-2 text-xs uppercase tracking-[0.28em] text-signal">
              MiniFT
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold sm:text-4xl">
                Create your workspace
              </h1>
              <p className="text-sm leading-6 text-mist">
                Set up a focused finance workspace with a default Cash account
                ready to use.
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
                autoComplete="new-password"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="currency">Default Currency</label>
              <Select
                id="currency"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
              >
                {currencies.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </div>

            {mutation.error ? (
              <div className="rounded-2xl border border-hazard/20 bg-hazard/10 px-4 py-3 text-sm text-hazard">
                <div className="font-medium">Registration failed</div>
                <p className="mt-1 text-hazard/90">
                  {mutation.error instanceof ApiError
                    ? mutation.error.message
                    : "Unable to register"}
                </p>
              </div>
            ) : null}

            <Button className="w-full" type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-mist">
            Already have an account?{" "}
            <Link className="text-signal hover:text-signal/80" href="/login">
              Sign in
            </Link>
          </p>
        </Card>

        <section className="panel hidden overflow-hidden p-8 lg:block lg:p-10">
          <div className="flex h-full flex-col justify-between gap-10">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.28em] text-signal">
                Fast monthly control
              </p>
              <h2 className="max-w-xl text-4xl font-semibold">
                Start with the essentials, then build your money map.
              </h2>
              <p className="max-w-lg text-sm leading-6 text-mist">
                MiniFT keeps the model simple: accounts, transfers, budgets,
                recurring entries, and reports that stay readable.
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-ink/45 p-5 shadow-soft">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.22em] text-mist">
                  Workspace setup
                </p>
                <h3 className="mt-2 text-2xl font-semibold">
                  What happens next
                </h3>
              </div>

              <div className="space-y-3">
                {[
                  "Default Cash account is created automatically",
                  "Choose your preferred reporting currency",
                  "Add budgets and recurring rules when you are ready",
                ].map((item, index) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-[18px] border border-white/10 bg-white/[0.035] p-4"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-signal/15 text-sm font-semibold text-signal">
                      {index + 1}
                    </div>
                    <div className="text-sm text-white">{item}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 text-sm text-mist sm:grid-cols-2">
              {[
                "Transfer mirroring between accounts",
                "Budget tracking per category",
                "Recurring transactions",
                "Monthly reporting",
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
        </section>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<main className="min-h-screen" />}>
      <RegisterPageContent />
    </Suspense>
  );
}
