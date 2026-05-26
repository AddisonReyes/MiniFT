"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { Card, Button, Input } from "@/components/ui";
import {
  confirmPasswordReset,
  requestPasswordReset,
  useSessionQuery,
} from "@/lib/auth";
import { describeError } from "@/lib/error-message";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const session = useSessionQuery();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [codeRequested, setCodeRequested] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  const requestMutation = useMutation({
    mutationFn: requestPasswordReset,
    onSuccess: () => {
      setCodeRequested(true);
      setSuccessMessage(t("auth.forgotPassword.codeSentMessage"));
    },
  });

  const confirmMutation = useMutation({
    mutationFn: confirmPasswordReset,
    onSuccess: () => {
      setSuccessMessage(t("auth.forgotPassword.successMessage"));
      setCode("");
      setPassword("");
      setPasswordConfirmation("");
      setCodeRequested(false);
    },
  });

  useEffect(() => {
    if (session.data) {
      router.replace("/dashboard");
    }
  }, [router, session.data]);

  function handleRequestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setClientError(null);
    setSuccessMessage(null);
    requestMutation.mutate({ email });
  }

  function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setClientError(null);
    setSuccessMessage(null);

    if (password !== passwordConfirmation) {
      setClientError(t("auth.forgotPassword.passwordMismatch"));
      return;
    }

    confirmMutation.mutate({
      email,
      code,
      password,
      password_confirmation: passwordConfirmation,
    });
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid w-full gap-6 lg:grid-cols-[0.84fr_1.16fr]">
        <Card className="p-6 sm:p-8">
          <div className="mb-8 space-y-5">
            <div className="inline-flex rounded-full border border-white/10 bg-ink/45 px-4 py-2 text-xs uppercase tracking-[0.28em] text-signal">
              MiniFT
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold sm:text-4xl">
                {t("auth.forgotPassword.headline")}
              </h1>
              <p className="text-sm leading-6 text-mist">
                {t("auth.forgotPassword.subtext")}
              </p>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleRequestCode}>
            <div className="space-y-2">
              <label htmlFor="forgot-email">{t("auth.emailLabel")}</label>
              <Input
                id="forgot-email"
                type="email"
                placeholder={t("auth.emailPlaceholder")}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <Button
              className="w-full"
              type="submit"
              variant="secondary"
              disabled={requestMutation.isPending}
            >
              {requestMutation.isPending
                ? t("auth.forgotPassword.sendingCode")
                : t("auth.forgotPassword.sendCode")}
            </Button>
          </form>

          {codeRequested ? (
            <form className="mt-6 space-y-5" onSubmit={handleResetPassword}>
              <div className="space-y-2">
                <label htmlFor="reset-code">{t("auth.forgotPassword.codeLabel")}</label>
                <Input
                  id="reset-code"
                  placeholder={t("auth.forgotPassword.codePlaceholder")}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  autoComplete="one-time-code"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="reset-password">{t("auth.forgotPassword.newPasswordLabel")}</label>
                <Input
                  id="reset-password"
                  type="password"
                  placeholder={t("auth.passwordPlaceholder")}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="reset-password-confirmation">
                  {t("auth.forgotPassword.confirmPasswordLabel")}
                </label>
                <Input
                  id="reset-password-confirmation"
                  type="password"
                  placeholder={t("auth.forgotPassword.confirmPasswordPlaceholder")}
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              <Button
                className="w-full"
                type="submit"
                disabled={confirmMutation.isPending}
              >
                {confirmMutation.isPending
                  ? t("auth.forgotPassword.savingPassword")
                  : t("auth.forgotPassword.savePassword")}
              </Button>
            </form>
          ) : null}

          {successMessage ? (
            <div className="mt-6 rounded-2xl border border-signal/20 bg-signal/10 px-4 py-3 text-sm text-signal">
              {successMessage}
            </div>
          ) : null}

          {clientError ? (
            <div className="mt-6 rounded-2xl border border-hazard/20 bg-hazard/10 px-4 py-3 text-sm text-hazard">
              {clientError}
            </div>
          ) : null}

          {requestMutation.error ? (
            <div className="mt-6 rounded-2xl border border-hazard/20 bg-hazard/10 px-4 py-3 text-sm text-hazard">
              {describeError(requestMutation.error, t("auth.forgotPassword.sendErrorFallback"))}
            </div>
          ) : null}

          {confirmMutation.error ? (
            <div className="mt-6 rounded-2xl border border-hazard/20 bg-hazard/10 px-4 py-3 text-sm text-hazard">
              {describeError(confirmMutation.error, t("auth.forgotPassword.confirmErrorFallback"))}
            </div>
          ) : null}

          <p className="mt-6 text-sm text-mist">
            {t("auth.forgotPassword.remembered")}{" "}
            <Link className="text-signal hover:text-signal/80" href="/login">
              {t("auth.forgotPassword.backToLogin")}
            </Link>
          </p>
        </Card>

        <section className="panel hidden overflow-hidden p-8 lg:block lg:p-10">
          <div className="flex h-full flex-col justify-between gap-10">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.28em] text-signal">
                {t("auth.forgotPassword.panelEyebrow")}
              </p>
              <h2 className="max-w-xl text-4xl font-semibold">
                {t("auth.forgotPassword.panelHeadline")}
              </h2>
              <p className="max-w-lg text-sm leading-6 text-mist">
                {t("auth.forgotPassword.panelBody")}
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-ink/45 p-5 shadow-soft">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.22em] text-mist">
                  {t("auth.forgotPassword.checklistEyebrow")}
                </p>
                <h3 className="mt-2 text-2xl font-semibold">
                  {t("auth.forgotPassword.checklistTitle")}
                </h3>
              </div>

              <div className="space-y-3">
                {[
                  t("auth.forgotPassword.checklistStep1"),
                  t("auth.forgotPassword.checklistStep2"),
                  t("auth.forgotPassword.checklistStep3"),
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
                t("auth.forgotPassword.noteFact1"),
                t("auth.forgotPassword.noteFact2"),
                t("auth.forgotPassword.noteFact3"),
                t("auth.forgotPassword.noteFact4"),
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
