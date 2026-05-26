"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { Card, Button, Input } from "@/components/ui";
import {
  resendVerificationEmail,
  sessionQueryKey,
  useSessionQuery,
  verifyEmail,
} from "@/lib/auth";
import { describeError } from "@/lib/error-message";
import { sanitizeRedirectTarget } from "@/lib/redirect";

function VerifyEmailPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const session = useSessionQuery();
  const nextPath = sanitizeRedirectTarget(searchParams.get("next"));
  const token = searchParams.get("token");
  const initialEmail = searchParams.get("email") ?? "";
  const [email, setEmail] = useState(initialEmail);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  const verifyMutation = useMutation({
    mutationFn: verifyEmail,
    onSuccess: async ({ user }) => {
      await queryClient.setQueryData(sessionQueryKey, user);
      router.replace(nextPath);
    },
  });

  const resendMutation = useMutation({
    mutationFn: resendVerificationEmail,
    onSuccess: (response) => {
      setResendNotice(response.message);
    },
  });

  useEffect(() => {
    if (!token && session.data) {
      router.replace(nextPath);
    }
  }, [nextPath, router, session.data, token]);

  useEffect(() => {
    if (token && verifyMutation.status === "idle") {
      verifyMutation.mutate({ token });
    }
  }, [token, verifyMutation]);

  function handleResend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResendNotice(null);
    resendMutation.mutate({ email });
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid w-full gap-6 lg:grid-cols-[0.84fr_1.16fr]">
        <Card className="p-6 sm:p-8">
          {token ? (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="inline-flex rounded-full border border-white/10 bg-ink/45 px-4 py-2 text-xs uppercase tracking-[0.28em] text-signal">
                  MiniFT
                </div>
                <div className="space-y-3">
                  <h1 className="text-3xl font-semibold sm:text-4xl">
                    {verifyMutation.isError
                      ? t("auth.verifyEmail.verifyErrorHeadline")
                      : t("auth.verifyEmail.verifyingHeadline")}
                  </h1>
                  <p className="text-sm leading-6 text-mist">
                    {verifyMutation.isError
                      ? describeError(verifyMutation.error, t("auth.verifyEmail.verifyErrorFallback"))
                      : t("auth.verifyEmail.verifyingSubtext")}
                  </p>
                </div>
              </div>

              {verifyMutation.isPending ? (
                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4 text-sm text-mist">
                  {t("auth.verifyEmail.verifyingPending")}
                </div>
              ) : null}

              {verifyMutation.isError ? (
                <div className="space-y-4">
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={() => router.replace("/verify-email")}
                  >
                    {t("auth.verifyEmail.requestNewLink")}
                  </Button>
                  <Link
                    className="block text-center text-sm text-signal hover:text-signal/80"
                    href="/login"
                  >
                    {t("auth.verifyEmail.backToLogin")}
                  </Link>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <div className="mb-8 space-y-5">
                <div className="inline-flex rounded-full border border-white/10 bg-ink/45 px-4 py-2 text-xs uppercase tracking-[0.28em] text-signal">
                  MiniFT
                </div>
                <div className="space-y-3">
                  <h1 className="text-3xl font-semibold sm:text-4xl">
                    {t("auth.verifyEmail.headline")}
                  </h1>
                  <p className="text-sm leading-6 text-mist">
                    {t("auth.verifyEmail.subtext")}
                  </p>
                </div>
              </div>

              <form className="space-y-5" onSubmit={handleResend}>
                <div className="space-y-2">
                  <label htmlFor="verify-email">{t("auth.emailLabel")}</label>
                  <Input
                    id="verify-email"
                    type="email"
                    placeholder={t("auth.emailPlaceholder")}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>

                {resendNotice ? (
                  <div className="rounded-2xl border border-signal/20 bg-signal/10 px-4 py-3 text-sm text-signal">
                    {resendNotice}
                  </div>
                ) : null}

                {resendMutation.error ? (
                  <div className="rounded-2xl border border-hazard/20 bg-hazard/10 px-4 py-3 text-sm text-hazard">
                    {describeError(resendMutation.error, t("auth.verifyEmail.resendErrorFallback"))}
                  </div>
                ) : null}

                <Button
                  className="w-full"
                  type="submit"
                  disabled={resendMutation.isPending}
                >
                  {resendMutation.isPending
                    ? t("auth.verifyEmail.resending")
                    : t("auth.verifyEmail.resendSubmit")}
                </Button>
              </form>

              <p className="mt-6 text-sm text-mist">
                {t("auth.verifyEmail.alreadyVerified")}{" "}
                <Link className="text-signal hover:text-signal/80" href="/login">
                  {t("auth.verifyEmail.goToLogin")}
                </Link>
              </p>
            </>
          )}
        </Card>

        <section className="panel hidden overflow-hidden p-8 lg:block lg:p-10">
          <div className="flex h-full flex-col justify-between gap-10">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.28em] text-signal">
                {t("auth.verifyEmail.panelEyebrow")}
              </p>
              <h2 className="max-w-xl text-4xl font-semibold">
                {t("auth.verifyEmail.panelHeadline")}
              </h2>
              <p className="max-w-lg text-sm leading-6 text-mist">
                {t("auth.verifyEmail.panelBody")}
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-ink/45 p-5 shadow-soft">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.22em] text-mist">
                  {t("auth.verifyEmail.flowEyebrow")}
                </p>
                <h3 className="mt-2 text-2xl font-semibold">
                  {t("auth.verifyEmail.flowTitle")}
                </h3>
              </div>

              <div className="space-y-3">
                {[
                  t("auth.verifyEmail.flowStep1"),
                  t("auth.verifyEmail.flowStep2"),
                  t("auth.verifyEmail.flowStep3"),
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
                t("auth.verifyEmail.noteFact1"),
                t("auth.verifyEmail.noteFact2"),
                t("auth.verifyEmail.noteFact3"),
                t("auth.verifyEmail.noteFact4"),
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

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="min-h-screen" />}>
      <VerifyEmailPageContent />
    </Suspense>
  );
}
