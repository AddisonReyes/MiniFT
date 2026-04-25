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
  const nextPath = searchParams.get("next") || "/";
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
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid w-full gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-8">
          <div className="mb-8 space-y-2">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.28em] text-signal">
              New workspace
            </div>
            <h1 className="text-3xl font-semibold">
              Create your MiniFT account
            </h1>
            <p className="text-sm text-mist">
              We create a default Cash account automatically so you can start
              tracking immediately.
            </p>
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
                {mutation.error instanceof ApiError
                  ? mutation.error.message
                  : "Unable to register"}
              </div>
            ) : null}

            <Button className="w-full" type="submit">
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

        <section className="panel flex flex-col justify-between p-8 sm:p-10">
          <div className="space-y-6">
            <h2 className="text-4xl font-semibold">
              Built for fast monthly control.
            </h2>
            <p className="max-w-lg text-base text-mist">
              Keep income, expenses, transfers, budgets, and recurring activity
              in one place. The reporting view stays readable because the app
              keeps the model simple.
            </p>
          </div>

          <div className="grid gap-4 text-sm text-mist sm:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
              Automatic cash account on signup
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
              Transfer mirroring between accounts
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
              Budget tracking per category
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
              Recurring transactions with background execution
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
