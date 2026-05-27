"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { PasswordInput } from "@/components/password-input";
import { Card, Button, Input, Select } from "@/components/ui";
import { register, sessionQueryKey, useSessionQuery } from "@/lib/auth";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";
import { describeError } from "@/lib/error-message";
import { sanitizeRedirectTarget } from "@/lib/redirect";

function RegisterPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = sanitizeRedirectTarget(searchParams.get("next"));
  const queryClient = useQueryClient();
  const session = useSessionQuery();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [clientError, setClientError] = useState("");

  const mutation = useMutation({
    mutationFn: register,
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
      router.replace(
        `/verify-email?email=${encodeURIComponent(response.email)}&next=${encodeURIComponent(nextPath)}`,
      );
    },
  });

  useEffect(() => {
    if (session.data) {
      router.replace(nextPath);
    }
  }, [nextPath, router, session.data]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== passwordConfirmation) {
      setClientError(t("auth.register.passwordMismatch"));
      return;
    }

    setClientError("");
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
                {t("auth.register.headline")}
              </h1>
              <p className="text-sm leading-6 text-mist">
                {t("auth.register.subtext")}
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
              <label htmlFor="password">{t("auth.passwordLabel")}</label>
              <PasswordInput
                id="password"
                placeholder={t("auth.passwordPlaceholder")}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setClientError("");
                }}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password-confirmation">
                {t("auth.register.confirmPasswordLabel")}
              </label>
              <PasswordInput
                id="password-confirmation"
                placeholder={t("auth.register.confirmPasswordPlaceholder")}
                value={passwordConfirmation}
                onChange={(event) => {
                  setPasswordConfirmation(event.target.value);
                  setClientError("");
                }}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="currency">{t("auth.register.currencyLabel")}</label>
              <Select
                id="currency"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
              >
                {SUPPORTED_CURRENCIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </div>

            {clientError ? (
              <div className="rounded-2xl border border-hazard/20 bg-hazard/10 px-4 py-3 text-sm text-hazard">
                {clientError}
              </div>
            ) : null}

            {mutation.error ? (
              <div className="rounded-2xl border border-hazard/20 bg-hazard/10 px-4 py-3 text-sm text-hazard">
                <div className="font-medium">{t("auth.register.errorTitle")}</div>
                <p className="mt-1 text-hazard/90">
                  {describeError(mutation.error, t("auth.register.errorFallback"))}
                </p>
              </div>
            ) : null}

            <Button
              className="w-full"
              type="submit"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? t("auth.register.submitting") : t("auth.register.submit")}
            </Button>
          </form>

          <p className="mt-6 text-sm text-mist">
            {t("auth.register.hasAccount")}{" "}
            <Link className="text-signal hover:text-signal/80" href="/login">
              {t("auth.register.signIn")}
            </Link>
          </p>
        </Card>

        <section className="panel hidden overflow-hidden p-8 lg:block lg:p-10">
          <div className="flex h-full flex-col justify-between gap-10">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.28em] text-signal">
                {t("auth.register.panelEyebrow")}
              </p>
              <h2 className="max-w-xl text-4xl font-semibold">
                {t("auth.register.panelHeadline")}
              </h2>
              <p className="max-w-lg text-sm leading-6 text-mist">
                {t("auth.register.panelBody")}
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-ink/45 p-5 shadow-soft">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.22em] text-mist">
                  {t("auth.register.setupEyebrow")}
                </p>
                <h3 className="mt-2 text-2xl font-semibold">
                  {t("auth.register.setupTitle")}
                </h3>
              </div>

              <div className="space-y-3">
                {[
                  t("auth.register.setupStep1"),
                  t("auth.register.setupStep2"),
                  t("auth.register.setupStep3"),
                  t("auth.register.setupStep4"),
                ].map((item, index) => (
                  <div
                    key={index}
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
                t("auth.register.featureTransferMirroring"),
                t("auth.register.featureBudgetTracking"),
                t("auth.register.featureRecurring"),
                t("auth.register.featureReporting"),
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
