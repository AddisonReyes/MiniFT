"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { FinanceSnapshot } from "@/components/marketing/finance-snapshot";
import { PasswordInput } from "@/components/password-input";
import { Card, Button, Input } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { login, sessionQueryKey, useSessionQuery } from "@/lib/auth";
import { describeError } from "@/lib/error-message";
import { sanitizeRedirectTarget } from "@/lib/redirect";

function LoginPageContent() {
  const { t } = useTranslation();
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

  const shouldOfferVerificationResend =
    mutation.error instanceof ApiError && mutation.error.status === 403 && email;

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
                {t("auth.login.headline")}
              </h1>
              <p className="text-sm leading-6 text-mist">
                {t("auth.login.subtext")}
              </p>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="email">{t("auth.emailLabel")}</label>
              <Input
                id="email"
                type="email"
                placeholder={t("auth.emailPlaceholder")}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="password">{t("auth.passwordLabel")}</label>
                <Link
                  className="text-xs text-signal hover:text-signal/80"
                  href="/forgot-password"
                >
                  {t("auth.login.forgotPassword")}
                </Link>
              </div>
              <PasswordInput
                id="password"
                placeholder={t("auth.passwordPlaceholder")}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {mutation.error ? (
              <div className="rounded-2xl border border-hazard/20 bg-hazard/10 px-4 py-3 text-sm text-hazard">
                <div className="font-medium">{t("auth.login.errorTitle")}</div>
                <p className="mt-1 text-hazard/90">
                  {describeError(mutation.error, t("auth.login.errorFallback"))}
                </p>
                {shouldOfferVerificationResend ? (
                  <p className="mt-3">
                    <Link
                      className="text-signal hover:text-signal/80"
                      href={`/verify-email?email=${encodeURIComponent(email)}`}
                    >
                      {t("auth.login.resendVerification")}
                    </Link>
                  </p>
                ) : null}
              </div>
            ) : null}

            <Button
              className="w-full"
              type="submit"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? t("auth.login.submitting") : t("auth.login.submit")}
            </Button>
          </form>

          <p className="mt-6 text-sm text-mist">
            {t("auth.login.noAccount")}{" "}
            <Link className="text-signal hover:text-signal/80" href="/register">
              {t("auth.login.createOne")}
            </Link>
          </p>
        </Card>

        <section className="panel hidden overflow-hidden p-8 lg:block lg:p-10">
          <div className="flex h-full flex-col justify-between gap-10">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.28em] text-signal">
                {t("auth.login.panelEyebrow")}
              </p>
              <h2 className="max-w-xl text-4xl font-semibold">
                {t("auth.login.panelHeadline")}
              </h2>
              <p className="max-w-lg text-sm leading-6 text-mist">
                {t("auth.login.panelBody")}
              </p>
            </div>

            <FinanceSnapshot />

            <div className="grid gap-3 text-sm text-mist sm:grid-cols-4">
              {[
                t("landing.features.accounts.title"),
                t("landing.features.budgets.title"),
                t("landing.features.recurring.title"),
                t("landing.features.reports.title"),
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

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen" />}>
      <LoginPageContent />
    </Suspense>
  );
}
