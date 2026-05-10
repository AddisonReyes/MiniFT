"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { Card, Button, Input } from "@/components/ui";
import {
  confirmPasswordReset,
  requestPasswordReset,
  useSessionQuery,
} from "@/lib/auth";
import { describeError } from "@/lib/error-message";

export default function ForgotPasswordPage() {
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
      setSuccessMessage(
        "If that email exists in MiniFT, a reset code has been sent.",
      );
    },
  });

  const confirmMutation = useMutation({
    mutationFn: confirmPasswordReset,
    onSuccess: () => {
      setSuccessMessage(
        "Password updated. You can now sign in with the new password.",
      );
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
      setClientError("Passwords do not match");
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
                Reset your password
              </h1>
              <p className="text-sm leading-6 text-mist">
                Ask for a one-time code, then choose a new password for your
                account.
              </p>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleRequestCode}>
            <div className="space-y-2">
              <label htmlFor="forgot-email">Email</label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="you@example.com"
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
              {requestMutation.isPending ? "Sending code..." : "Send reset code"}
            </Button>
          </form>

          {codeRequested ? (
            <form className="mt-6 space-y-5" onSubmit={handleResetPassword}>
              <div className="space-y-2">
                <label htmlFor="reset-code">Email code</label>
                <Input
                  id="reset-code"
                  placeholder="6-digit code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  autoComplete="one-time-code"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="reset-password">New password</label>
                <Input
                  id="reset-password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="reset-password-confirmation">
                  Confirm new password
                </label>
                <Input
                  id="reset-password-confirmation"
                  type="password"
                  placeholder="Repeat the new password"
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
                  ? "Updating password..."
                  : "Save new password"}
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
              {describeError(
                requestMutation.error,
                "Unable to send the reset code",
              )}
            </div>
          ) : null}

          {confirmMutation.error ? (
            <div className="mt-6 rounded-2xl border border-hazard/20 bg-hazard/10 px-4 py-3 text-sm text-hazard">
              {describeError(
                confirmMutation.error,
                "Unable to reset the password",
              )}
            </div>
          ) : null}

          <p className="mt-6 text-sm text-mist">
            Remembered it?{" "}
            <Link className="text-signal hover:text-signal/80" href="/login">
              Back to login
            </Link>
          </p>
        </Card>

        <section className="panel hidden overflow-hidden p-8 lg:block lg:p-10">
          <div className="flex h-full flex-col justify-between gap-10">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.28em] text-signal">
                Recovery flow
              </p>
              <h2 className="max-w-xl text-4xl font-semibold">
                Reset codes stay inside the app instead of bouncing you through
                multiple screens.
              </h2>
              <p className="max-w-lg text-sm leading-6 text-mist">
                Enter the code from your inbox, choose a new password, and head
                back to login when you are ready.
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-ink/45 p-5 shadow-soft">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.22em] text-mist">
                  Recovery checklist
                </p>
                <h3 className="mt-2 text-2xl font-semibold">Three quick steps</h3>
              </div>

              <div className="space-y-3">
                {[
                  "Enter the account email",
                  "Use the code sent by MiniFT",
                  "Save the new password and sign back in",
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
                "Codes expire after a short window",
                "Only the latest code remains active",
                "Existing refresh sessions are revoked after reset",
                "The same email path is reused in settings",
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
