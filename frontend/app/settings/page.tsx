"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

import { FormError } from "@/components/form-error";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { PageFrame } from "@/components/page-frame";
import { Badge, Button, Card, Input, Select, cn } from "@/components/ui";
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

function SettingsSectionHeader({
  eyebrow,
  title,
  description,
  tone = "signal",
}: {
  eyebrow: string;
  title: string;
  description: string;
  tone?: "signal" | "hazard";
}) {
  return (
    <div>
      <p
        className={
          tone === "hazard"
            ? "text-xs uppercase tracking-[0.22em] text-hazard"
            : "text-xs uppercase tracking-[0.22em] text-signal/80"
        }
      >
        {eyebrow}
      </p>
      <h2 className="mt-2 text-xl font-semibold sm:text-2xl">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-mist">{description}</p>
    </div>
  );
}

function InfoTile({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[20px] border border-white/10 bg-white/[0.03] p-4",
        className,
      )}
    >
      <div className="text-xs uppercase tracking-[0.18em] text-mist">
        {label}
      </div>
      <div className="mobile-safe-text mt-2 font-medium text-white">
        {children}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
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
      setPasswordSuccessMessage(t("settingsPage.security.updatedMessage"));
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
      setPasswordClientError(t("settingsPage.security.passwordMismatch"));
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
      title={t("settings.title")}
      description={t("settings.description")}
    >
      <div className="grid items-start gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <Card className="space-y-5">
            <SettingsSectionHeader
              eyebrow={t("settingsPage.profile.eyebrow")}
              title={t("settingsPage.profile.title")}
              description={t("settingsPage.profile.description")}
            />

            <div className="grid gap-3">
              <InfoTile label={t("settingsPage.profile.email")}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="break-all">
                    {user?.email || t("common.notAvailable")}
                  </span>
                  <Badge tone={user?.email_verified_at ? "success" : "amber"}>
                    {user?.email_verified_at
                      ? t("common.verified")
                      : t("common.pending")}
                  </Badge>
                </div>
              </InfoTile>

              <div className="grid gap-3 sm:grid-cols-3">
                <InfoTile label={t("settingsPage.profile.defaultCurrency")}>
                  {user?.currency || "USD"}
                </InfoTile>
                <InfoTile label={t("settingsPage.profile.joined")}>
                  {user?.created_at
                    ? formatDateTime(user.created_at)
                    : t("common.notAvailable")}
                </InfoTile>
                <InfoTile label={t("settingsPage.profile.verifiedAt")}>
                  {user?.email_verified_at
                    ? formatDateTime(user.email_verified_at)
                    : t("common.pending")}
                </InfoTile>
              </div>
            </div>
          </Card>

          <Card className="space-y-5">
            <SettingsSectionHeader
              eyebrow={t("settingsPage.preferences.eyebrow")}
              title={t("settingsPage.preferences.title")}
              description={t("settingsPage.preferences.description")}
            />

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <div className="space-y-2">
                  <label htmlFor="default-currency">
                    {t("settingsPage.preferences.currencyLabel")}
                  </label>
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

                <Button
                  className="w-full sm:w-auto"
                  type="submit"
                  disabled={updateCurrencyMutation.isPending}
                >
                  {updateCurrencyMutation.isPending
                    ? t("settingsPage.preferences.saving")
                    : t("settingsPage.preferences.save")}
                </Button>
              </div>

              <FormError
                error={updateCurrencyMutation.error}
                fallbackMessage={t("settingsPage.preferences.errorFallback")}
              />
            </form>
          </Card>

          <Card className="space-y-5">
            <SettingsSectionHeader
              eyebrow={t("settings.language.sectionTitle")}
              title={t("settings.language.sectionTitle")}
              description={t("settings.language.sectionDescription")}
            />
            <div className="grid gap-3 rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
              <LocaleSwitcher className="w-full" />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-5">
            <SettingsSectionHeader
              eyebrow={t("settingsPage.security.eyebrow")}
              title={t("settingsPage.security.title")}
              description={t("settingsPage.security.description")}
            />

            <Button
              className="w-full sm:w-auto"
              variant="secondary"
              onClick={() => {
                setPasswordSuccessMessage(null);
                setPasswordClientError(null);
                requestPasswordChangeMutation.mutate();
              }}
              disabled={requestPasswordChangeMutation.isPending}
            >
              {requestPasswordChangeMutation.isPending
                ? t("settingsPage.security.sendingCode")
                : passwordCodeSent
                  ? t("settingsPage.security.resendCode")
                  : t("settingsPage.security.sendCode")}
            </Button>

            {passwordSuccessMessage ? (
              <div className="rounded-2xl border border-signal/20 bg-signal/10 px-4 py-3 text-sm text-signal">
                {passwordSuccessMessage}
              </div>
            ) : null}

            <FormError
              error={requestPasswordChangeMutation.error}
              fallbackMessage={t("settingsPage.security.sendErrorFallback")}
            />

            {passwordCodeSent ? (
              <form className="space-y-5" onSubmit={handlePasswordChangeSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <label htmlFor="settings-password-code">
                      {t("settingsPage.security.codeLabel")}
                    </label>
                    <Input
                      id="settings-password-code"
                      placeholder={t("settingsPage.security.codePlaceholder")}
                      value={passwordCode}
                      onChange={(event) => setPasswordCode(event.target.value)}
                      autoComplete="one-time-code"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="settings-new-password">
                      {t("settingsPage.security.newPasswordLabel")}
                    </label>
                    <Input
                      id="settings-new-password"
                      type="password"
                      placeholder={t("auth.passwordPlaceholder")}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      autoComplete="new-password"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="settings-password-confirmation">
                      {t("settingsPage.security.confirmPasswordLabel")}
                    </label>
                    <Input
                      id="settings-password-confirmation"
                      type="password"
                      placeholder={t(
                        "auth.forgotPassword.confirmPasswordPlaceholder",
                      )}
                      value={passwordConfirmation}
                      onChange={(event) =>
                        setPasswordConfirmation(event.target.value)
                      }
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>

                {passwordClientError ? (
                  <div className="rounded-2xl border border-hazard/20 bg-hazard/10 px-4 py-3 text-sm text-hazard">
                    {passwordClientError}
                  </div>
                ) : null}

                <FormError
                  error={confirmPasswordChangeMutation.error}
                  fallbackMessage={t(
                    "settingsPage.security.confirmErrorFallback",
                  )}
                />

                <div className="flex justify-end">
                  <Button
                    className="w-full sm:w-auto"
                    type="submit"
                    disabled={confirmPasswordChangeMutation.isPending}
                  >
                    {confirmPasswordChangeMutation.isPending
                      ? t("settingsPage.security.saving")
                      : t("settingsPage.security.save")}
                  </Button>
                </div>
              </form>
            ) : null}
          </Card>

          <Card className="space-y-5">
            <SettingsSectionHeader
              eyebrow={t("settingsPage.integrations.eyebrow")}
              title={t("settingsPage.integrations.title")}
              description={t("settingsPage.integrations.description")}
            />

            <Link
              href="/settings/integrations"
              className="block sm:inline-block"
            >
              <Button className="w-full sm:w-auto" variant="secondary">
                {t("settingsPage.integrations.open")}
              </Button>
            </Link>
          </Card>

          <Card className="flex flex-col justify-between gap-6 border-hazard/20 bg-hazard/5">
            <SettingsSectionHeader
              eyebrow={t("settingsPage.session.eyebrow")}
              title={t("settingsPage.session.title")}
              description={t("settingsPage.session.description")}
              tone="hazard"
            />

            <Button
              className="w-full sm:w-auto sm:self-start"
              variant="danger"
              onClick={() => logoutMutation.mutate()}
            >
              {logoutMutation.isPending
                ? t("settingsPage.session.signingOut")
                : t("settingsPage.session.signOut")}
            </Button>
          </Card>
        </div>
      </div>
    </PageFrame>
  );
}
