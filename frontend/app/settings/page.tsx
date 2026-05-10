"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { FormError } from "@/components/form-error";
import { PageFrame } from "@/components/page-frame";
import { Badge, Button, Card, Input, Select } from "@/components/ui";
import {
  confirmPasswordChange,
  logout,
  requestPasswordChange,
  sessionQueryKey,
  updateDefaultCurrency,
  useSessionQuery,
} from "@/lib/auth";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useSessionQuery();
  const user = session.data;
  const [draftCurrency, setDraftCurrency] = useState<string | null>(null);
  const currency = draftCurrency ?? user?.currency ?? "USD";
  const [passwordCodeSent, setPasswordCodeSent] = useState(false);
  const [passwordCode, setPasswordCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<
    string | null
  >(null);
  const [passwordClientError, setPasswordClientError] = useState<string | null>(
    null,
  );

  const updateCurrencyMutation = useMutation({
    mutationFn: updateDefaultCurrency,
    onSuccess: async (updatedUser) => {
      await queryClient.setQueryData(sessionQueryKey, updatedUser);
      setDraftCurrency(updatedUser.currency);
    },
  });

  const requestPasswordChangeMutation = useMutation({
    mutationFn: requestPasswordChange,
    onSuccess: (response) => {
      setPasswordCodeSent(true);
      setPasswordSuccessMessage(response.message);
      setPasswordClientError(null);
    },
  });

  const confirmPasswordChangeMutation = useMutation({
    mutationFn: confirmPasswordChange,
    onSuccess: async ({ user: updatedUser }) => {
      await queryClient.setQueryData(sessionQueryKey, updatedUser);
      setPasswordCodeSent(false);
      setPasswordCode("");
      setNewPassword("");
      setPasswordConfirmation("");
      setPasswordClientError(null);
      setPasswordSuccessMessage(
        "Password updated. This browser session has been refreshed.",
      );
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await queryClient.removeQueries({ queryKey: sessionQueryKey });
      router.replace("/login");
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateCurrencyMutation.mutate({ currency });
  }

  function handlePasswordChangeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordSuccessMessage(null);
    setPasswordClientError(null);

    if (newPassword !== passwordConfirmation) {
      setPasswordClientError("Passwords do not match");
      return;
    }

    confirmPasswordChangeMutation.mutate({
      code: passwordCode,
      password: newPassword,
      password_confirmation: passwordConfirmation,
    });
  }

  return (
    <PageFrame
      title="Settings"
      description="Review profile details, update your default currency, manage password confirmations, and control your current session."
    >
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-signal/80">
              Profile
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Account details</h2>
            <p className="mt-2 text-sm text-mist">
              This information comes from your current authenticated session.
            </p>
          </div>

          <div className="grid gap-3">
            <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-mist">
                Email
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <div className="break-all font-medium text-white">
                  {user?.email || "Not available"}
                </div>
                <Badge tone={user?.email_verified_at ? "success" : "amber"}>
                  {user?.email_verified_at ? "Verified" : "Pending"}
                </Badge>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-mist">
                  Default currency
                </div>
                <div className="mt-2 font-medium text-white">
                  {user?.currency || "USD"}
                </div>
              </div>

              <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-mist">
                  Joined
                </div>
                <div className="mt-2 font-medium text-white">
                  {user?.created_at ? formatDateTime(user.created_at) : "N/A"}
                </div>
              </div>

              <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-mist">
                  Verified
                </div>
                <div className="mt-2 font-medium text-white">
                  {user?.email_verified_at
                    ? formatDateTime(user.email_verified_at)
                    : "Pending"}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-signal/80">
              Preferences
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Default currency</h2>
            <p className="mt-2 text-sm text-mist">
              This becomes the suggested currency for new accounts and the base
              currency for converted totals across the app.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="default-currency">Currency</label>
              <Select
                id="default-currency"
                value={currency}
                onChange={(event) => setDraftCurrency(event.target.value)}
              >
                {SUPPORTED_CURRENCIES.map((supportedCurrency) => (
                  <option key={supportedCurrency} value={supportedCurrency}>
                    {supportedCurrency}
                  </option>
                ))}
              </Select>
            </div>

            <FormError
              error={updateCurrencyMutation.error}
              fallbackMessage="Unable to update default currency"
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={updateCurrencyMutation.isPending}>
                {updateCurrencyMutation.isPending
                  ? "Saving..."
                  : "Save default currency"}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-signal/80">
              Security
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Change password</h2>
            <p className="mt-2 text-sm text-mist">
              We send a confirmation code to your email before replacing the
              password for this account.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setPasswordSuccessMessage(null);
                setPasswordClientError(null);
                requestPasswordChangeMutation.mutate();
              }}
              disabled={requestPasswordChangeMutation.isPending}
            >
              {requestPasswordChangeMutation.isPending
                ? "Sending code..."
                : passwordCodeSent
                  ? "Send a new code"
                  : "Send confirmation code"}
            </Button>
          </div>

          {passwordSuccessMessage ? (
            <div className="rounded-2xl border border-signal/20 bg-signal/10 px-4 py-3 text-sm text-signal">
              {passwordSuccessMessage}
            </div>
          ) : null}

          <FormError
            error={requestPasswordChangeMutation.error}
            fallbackMessage="Unable to send the password change code"
          />

          {passwordCodeSent ? (
            <form className="space-y-5" onSubmit={handlePasswordChangeSubmit}>
              <div className="space-y-2">
                <label htmlFor="settings-password-code">Email code</label>
                <Input
                  id="settings-password-code"
                  placeholder="6-digit code"
                  value={passwordCode}
                  onChange={(event) => setPasswordCode(event.target.value)}
                  autoComplete="one-time-code"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="settings-new-password">New password</label>
                <Input
                  id="settings-new-password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="settings-password-confirmation">
                  Confirm new password
                </label>
                <Input
                  id="settings-password-confirmation"
                  type="password"
                  placeholder="Repeat the new password"
                  value={passwordConfirmation}
                  onChange={(event) =>
                    setPasswordConfirmation(event.target.value)
                  }
                  autoComplete="new-password"
                  required
                />
              </div>

              {passwordClientError ? (
                <div className="rounded-2xl border border-hazard/20 bg-hazard/10 px-4 py-3 text-sm text-hazard">
                  {passwordClientError}
                </div>
              ) : null}

              <FormError
                error={confirmPasswordChangeMutation.error}
                fallbackMessage="Unable to update the password"
              />

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={confirmPasswordChangeMutation.isPending}
                >
                  {confirmPasswordChangeMutation.isPending
                    ? "Updating..."
                    : "Save new password"}
                </Button>
              </div>
            </form>
          ) : null}
        </Card>

        <Card className="flex flex-col justify-between gap-6 border-hazard/20 bg-hazard/5">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-hazard">
              Session
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Sign out</h2>
            <p className="mt-2 text-sm text-mist">
              End this session and return to the login page.
            </p>
          </div>

          <Button
            className="w-full"
            variant="danger"
            onClick={() => logoutMutation.mutate()}
          >
            {logoutMutation.isPending ? "Signing out..." : "Sign out"}
          </Button>
        </Card>
      </div>
    </PageFrame>
  );
}
