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
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { LocaleSwitcher } from "@/components/locale-switcher";

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
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">

        {/* Language section */}
        <Card className="space-y-5 lg:col-span-2">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-signal/80">
              {t("settings.language.sectionTitle")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold">{t("settings.language.sectionTitle")}</h2>
            <p className="mt-2 text-sm text-mist">{t("settings.language.sectionDescription")}</p>
          </div>
          <div className="flex items-center gap-4">
            <LocaleSwitcher />
            <span className="text-sm text-mist">
              {t("settings.language.english")} / {t("settings.language.spanish")}
            </span>
          </div>
        </Card>
        <Card className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-signal/80">
              {t("settingsPage.profile.eyebrow")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold">{t("settingsPage.profile.title")}</h2>
            <p className="mt-2 text-sm text-mist">
              {t("settingsPage.profile.description")}
            </p>
          </div>

          <div className="grid gap-3">
            <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-mist">
                {t("settingsPage.profile.email")}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <div className="break-all font-medium text-white">
                  {user?.email || t("common.notAvailable")}
                </div>
                <Badge tone={user?.email_verified_at ? "success" : "amber"}>
                  {user?.email_verified_at ? t("common.verified") : t("common.pending")}
                </Badge>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-mist">
                  {t("settingsPage.profile.defaultCurrency")}
                </div>
                <div className="mt-2 font-medium text-white">
                  {user?.currency || "USD"}
                </div>
              </div>

              <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-mist">
                  {t("settingsPage.profile.joined")}
                </div>
                <div className="mt-2 font-medium text-white">
                  {user?.created_at ? formatDateTime(user.created_at) : t("common.notAvailable")}
                </div>
              </div>

              <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-mist">
                  {t("settingsPage.profile.verifiedAt")}
                </div>
                <div className="mt-2 font-medium text-white">
                  {user?.email_verified_at
                    ? formatDateTime(user.email_verified_at)
                    : t("common.pending")}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-signal/80">
              {t("settingsPage.preferences.eyebrow")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold">{t("settingsPage.preferences.title")}</h2>
            <p className="mt-2 text-sm text-mist">
              {t("settingsPage.preferences.description")}
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="default-currency">{t("settingsPage.preferences.currencyLabel")}</label>
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
              fallbackMessage={t("settingsPage.preferences.errorFallback")}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={updateCurrencyMutation.isPending}>
                {updateCurrencyMutation.isPending
                  ? t("settingsPage.preferences.saving")
                  : t("settingsPage.preferences.save")}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-signal/80">
              {t("settingsPage.integrations.eyebrow")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold">{t("settingsPage.integrations.title")}</h2>
            <p className="mt-2 text-sm text-mist">
              {t("settingsPage.integrations.description")}
            </p>
          </div>

          <Link href="/settings/integrations">
            <Button variant="secondary">{t("settingsPage.integrations.open")}</Button>
          </Link>
        </Card>

        <Card className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-signal/80">
              {t("settingsPage.security.eyebrow")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold">{t("settingsPage.security.title")}</h2>
            <p className="mt-2 text-sm text-mist">
              {t("settingsPage.security.description")}
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
                ? t("settingsPage.security.sendingCode")
                : passwordCodeSent
                  ? t("settingsPage.security.resendCode")
                  : t("settingsPage.security.sendCode")}
            </Button>
          </div>

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
              <div className="space-y-2">
                <label htmlFor="settings-password-code">{t("settingsPage.security.codeLabel")}</label>
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
                <label htmlFor="settings-new-password">{t("settingsPage.security.newPasswordLabel")}</label>
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
                  placeholder={t("auth.forgotPassword.confirmPasswordPlaceholder")}
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
                fallbackMessage={t("settingsPage.security.confirmErrorFallback")}
              />

              <div className="flex justify-end">
                <Button
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

        <Card className="flex flex-col justify-between gap-6 border-hazard/20 bg-hazard/5">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-hazard">
              {t("settingsPage.session.eyebrow")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold">{t("settingsPage.session.title")}</h2>
            <p className="mt-2 text-sm text-mist">
              {t("settingsPage.session.description")}
            </p>
          </div>

          <Button
            className="w-full"
            variant="danger"
            onClick={() => logoutMutation.mutate()}
          >
            {logoutMutation.isPending ? t("settingsPage.session.signingOut") : t("settingsPage.session.signOut")}
          </Button>
        </Card>
      </div>
    </PageFrame>
  );
}
