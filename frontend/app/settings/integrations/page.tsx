"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { PageFrame } from "@/components/page-frame";
import { Badge, Button, Card, Modal, ModalActions } from "@/components/ui";
import {
  useDisconnectGmail,
  useGmailIntegration,
  useGoogleConnect,
  useSyncImports,
  useUpdateGmailPreferences,
} from "@/lib/gmail-integration";
import { formatDateTime } from "@/lib/format";

const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

export default function IntegrationsPage() {
  const { t } = useTranslation();
  const statusQuery = useGmailIntegration();
  const connectMutation = useGoogleConnect();
  const syncMutation = useSyncImports();
  const disconnectMutation = useDisconnectGmail();
  const preferencesMutation = useUpdateGmailPreferences();
  const [isConsentModalOpen, setConsentModalOpen] = useState(false);
  const [googleConnected] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return new URLSearchParams(window.location.search).get("google") === "connected";
  });
  const status = statusQuery.data;

  return (
    <PageFrame
      title={t("integrations.title")}
      description={t("integrations.description")}
      actions={
        <>
          <Link href="/imports" className="w-full sm:w-auto">
            <Button className="w-full" variant="secondary">
              {t("integrations.reviewImports")}
            </Button>
          </Link>
          {status?.connected ? (
            <Button
              className="w-full sm:w-auto"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending || status.sync_in_progress}
            >
              {status.sync_in_progress || syncMutation.isPending
                ? t("integrations.syncing")
                : t("integrations.syncNow")}
            </Button>
          ) : (
            <Button
              className="w-full sm:w-auto"
              onClick={() => setConsentModalOpen(true)}
              disabled={statusQuery.isLoading || connectMutation.isPending}
            >
              {connectMutation.isPending
                ? t("integrations.openingGoogle")
                : t("integrations.connectGmail")}
            </Button>
          )}
        </>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-signal/80">
              {t("integrations.safeByDesign")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              {t("integrations.safeTitle")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-mist">
              {t("integrations.safeBody")}
            </p>
          </div>

          {googleConnected ? (
            <div className="rounded-[20px] border border-signal/20 bg-signal/10 px-4 py-3 text-sm text-signal">
              {t("integrations.connectedNotice")}
            </div>
          ) : null}

          {statusQuery.error instanceof Error ? (
            <div className="rounded-[20px] border border-hazard/20 bg-hazard/10 px-4 py-3 text-sm text-hazard">
              {statusQuery.error.message}
            </div>
          ) : null}

          {connectMutation.error instanceof Error ? (
            <div className="rounded-[20px] border border-hazard/20 bg-hazard/10 px-4 py-3 text-sm text-hazard">
              {connectMutation.error.message}
            </div>
          ) : null}

          {!status?.configured ? (
            <div className="rounded-[24px] border border-amber/20 bg-amber/10 p-5 text-sm text-amber">
              {t("integrations.notConfigured")}
            </div>
          ) : status?.connected ? (
            <div className="grid gap-4">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-mist">
                      {t("integrations.connectedGmail")}
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {status.google_email}
                    </div>
                  </div>
                  <Badge tone={status.sync_in_progress ? "amber" : "success"}>
                    {status.sync_in_progress
                      ? t("integrations.statusSyncing")
                      : t("integrations.statusConnected")}
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-[18px] border border-white/10 bg-ink/45 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-mist">
                      {t("integrations.lastSync")}
                    </div>
                    <div className="mt-2 text-sm font-medium text-white">
                      {status.last_synced_at
                        ? formatDateTime(status.last_synced_at)
                        : t("integrations.notYet")}
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-white/10 bg-ink/45 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-mist">
                      {t("integrations.imported")}
                    </div>
                    <div className="mt-2 text-sm font-medium text-white">
                      {status.imported_count}
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-white/10 bg-ink/45 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-mist">
                      {t("integrations.pendingReview")}
                    </div>
                    <div className="mt-2 text-sm font-medium text-white">
                      {status.pending_review_count}
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-white/10 bg-ink/45 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-mist">
                      {t("integrations.readyNow")}
                    </div>
                    <div className="mt-2 text-sm font-medium text-white">
                      {status.ready_count}
                    </div>
                  </div>
                </div>
              </div>

              {status.last_error ? (
                <div className="rounded-[20px] border border-amber/20 bg-amber/10 px-4 py-3 text-sm text-amber">
                  {t("integrations.lastSyncError", { error: status.last_error })}
                </div>
              ) : null}

              {preferencesMutation.error instanceof Error ? (
                <div className="rounded-[20px] border border-hazard/20 bg-hazard/10 px-4 py-3 text-sm text-hazard">
                  {preferencesMutation.error.message}
                </div>
              ) : null}

              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-mist">
                      {t("integrations.automation")}
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {t("integrations.automationTitle")}
                    </div>
                  </div>
                  <Badge
                    tone={status.auto_approve_ready_imports ? "success" : "amber"}
                  >
                    {status.auto_approve_ready_imports
                      ? t("integrations.autoApproveOn")
                      : t("integrations.manualApproval")}
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-mist">
                  {t("integrations.automationBody")}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-[18px] border border-white/10 bg-ink/45 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-mist">
                      {t("integrations.readyToApprove")}
                    </div>
                    <div className="mt-2 text-sm font-medium text-white">
                      {status.ready_count}
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-white/10 bg-ink/45 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-mist">
                      {t("integrations.needsAttention")}
                    </div>
                    <div className="mt-2 text-sm font-medium text-white">
                      {Math.max(status.pending_review_count - status.ready_count, 0)}
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:flex sm:flex-wrap">
                  <Button
                    className="w-full sm:w-auto"
                    variant={
                      status.auto_approve_ready_imports ? "secondary" : "primary"
                    }
                    onClick={() =>
                      preferencesMutation.mutate(
                        !status.auto_approve_ready_imports,
                      )
                    }
                    disabled={preferencesMutation.isPending}
                  >
                    {preferencesMutation.isPending
                      ? t("integrations.saving")
                      : status.auto_approve_ready_imports
                        ? t("integrations.disableAutoApprove")
                        : t("integrations.enableAutoApprove")}
                  </Button>
                  <Link href="/imports" className="w-full sm:w-auto">
                    <Button className="w-full sm:w-auto" variant="secondary">
                      {t("integrations.openReadyImports")}
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="grid gap-3 sm:flex sm:flex-wrap">
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending || status.sync_in_progress}
                >
                  {status.sync_in_progress || syncMutation.isPending
                    ? t("integrations.syncing")
                    : t("integrations.syncNow")}
                </Button>
                <Button
                  className="w-full sm:w-auto"
                  variant="danger"
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                >
                  {disconnectMutation.isPending
                    ? t("integrations.disconnecting")
                    : t("integrations.disconnect")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-mist">
                    {t("integrations.connectionStatus")}
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {t("integrations.notConnectedTitle")}
                  </div>
                  <p className="mt-2 max-w-xl text-sm text-mist">
                    {t("integrations.notConnectedBody")}
                  </p>
                </div>
                <Badge tone="amber">{t("integrations.awaitingConsent")}</Badge>
              </div>

              <div className="mt-5">
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => setConsentModalOpen(true)}
                  disabled={connectMutation.isPending}
                >
                  {connectMutation.isPending
                    ? t("integrations.openingGoogle")
                    : t("integrations.connectGmail")}
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Card className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-signal/80">
              {t("integrations.permissions")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              {t("integrations.requestedScope")}
            </h2>
            <p className="mt-2 text-sm text-mist">
              {t("integrations.scopeDescription")}
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-mist">
              {t("integrations.gmailReadonly")}
            </div>
            <div className="mt-2 break-all font-medium text-white">
              {status?.scopes[0] ?? GMAIL_SCOPE}
            </div>
            <p className="mt-3 text-sm text-mist">
              {t("integrations.gmailReadonlyBody")}
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-mist">
              {t("integrations.reviewWorkflow")}
            </div>
            <p className="mt-2 text-sm text-mist">
              {t("integrations.reviewWorkflowBody")}
            </p>
            <div className="mt-4">
              <Link href="/imports" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto" variant="secondary">
                  {t("integrations.openImportReview")}
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>

      <Modal
        open={isConsentModalOpen}
        title={t("integrations.consentTitle")}
        subtitle={t("integrations.consentSubtitle")}
        onClose={() => setConsentModalOpen(false)}
      >
        <div className="space-y-4 pb-6 text-sm text-mist">
          <p>{t("integrations.consentBody")}</p>
          <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-mist">
              {t("integrations.scopeRequested")}
            </div>
            <div className="mt-2 break-all font-medium text-white">
              {GMAIL_SCOPE}
            </div>
          </div>
        </div>
        <ModalActions>
          <Button
            variant="ghost"
            onClick={() => setConsentModalOpen(false)}
            disabled={connectMutation.isPending}
          >
            {t("integrations.cancel")}
          </Button>
          <Button
            onClick={() => {
              setConsentModalOpen(false);
              connectMutation.mutate();
            }}
            disabled={connectMutation.isPending}
          >
            {connectMutation.isPending
              ? t("integrations.openingGoogle")
              : t("integrations.continueToGoogle")}
          </Button>
        </ModalActions>
      </Modal>
    </PageFrame>
  );
}
