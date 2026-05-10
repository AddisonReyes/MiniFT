"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
                      ? "Verification failed"
                      : "Verifying your email"}
                  </h1>
                  <p className="text-sm leading-6 text-mist">
                    {verifyMutation.isError
                      ? describeError(
                          verifyMutation.error,
                          "This verification link is no longer valid.",
                        )
                      : "We are confirming your account and opening your MiniFT workspace."}
                  </p>
                </div>
              </div>

              {verifyMutation.isPending ? (
                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4 text-sm text-mist">
                  Hold on for a moment while we start your session.
                </div>
              ) : null}

              {verifyMutation.isError ? (
                <div className="space-y-4">
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={() => router.replace("/verify-email")}
                  >
                    Request a new verification link
                  </Button>
                  <Link
                    className="block text-center text-sm text-signal hover:text-signal/80"
                    href="/login"
                  >
                    Back to login
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
                    Check your inbox
                  </h1>
                  <p className="text-sm leading-6 text-mist">
                    We send a verification link before the first session starts.
                    Open the email and click the button to continue.
                  </p>
                </div>
              </div>

              <form className="space-y-5" onSubmit={handleResend}>
                <div className="space-y-2">
                  <label htmlFor="verify-email">Email</label>
                  <Input
                    id="verify-email"
                    type="email"
                    placeholder="you@example.com"
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
                    {describeError(
                      resendMutation.error,
                      "Unable to resend the verification email",
                    )}
                  </div>
                ) : null}

                <Button
                  className="w-full"
                  type="submit"
                  disabled={resendMutation.isPending}
                >
                  {resendMutation.isPending
                    ? "Sending link..."
                    : "Resend verification email"}
                </Button>
              </form>

              <p className="mt-6 text-sm text-mist">
                Already verified?{" "}
                <Link className="text-signal hover:text-signal/80" href="/login">
                  Go to login
                </Link>
              </p>
            </>
          )}
        </Card>

        <section className="panel hidden overflow-hidden p-8 lg:block lg:p-10">
          <div className="flex h-full flex-col justify-between gap-10">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.28em] text-signal">
                Secure onboarding
              </p>
              <h2 className="max-w-xl text-4xl font-semibold">
                Email verification keeps account recovery tied to a real inbox.
              </h2>
              <p className="max-w-lg text-sm leading-6 text-mist">
                MiniFT uses the same email channel for account verification,
                password recovery, and settings confirmation.
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-ink/45 p-5 shadow-soft">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.22em] text-mist">
                  How it works
                </p>
                <h3 className="mt-2 text-2xl font-semibold">Verification flow</h3>
              </div>

              <div className="space-y-3">
                {[
                  "Create the account with your default currency",
                  "Open the verification email from MiniFT",
                  "Click the link and continue straight into the app",
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
                "Verification links start the session automatically",
                "Reset codes are single-use and time-limited",
                "Settings changes use the same email confirmation pattern",
                "The app stays readable and focused across auth flows",
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
