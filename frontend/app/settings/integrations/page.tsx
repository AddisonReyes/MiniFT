"use client";

import Link from "next/link";
import { useState } from "react";

import { PageFrame } from "@/components/page-frame";
import { Badge, Button, Card, Modal, ModalActions } from "@/components/ui";
import {
  startGoogleConnectFlow,
  useDisconnectGmail,
  useGmailIntegration,
  useSyncImports,
  useUpdateGmailPreferences,
} from "@/lib/gmail-integration";
import { formatDateTime } from "@/lib/format";

const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

export default function IntegrationsPage() {
  const statusQuery = useGmailIntegration();
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
      title="Integrations"
      description="Connect Gmail so MiniFT can read bank alert emails, parse supported Dominican bank notifications, and import transactions without asking for banking credentials."
      actions={
        <>
          <Link href="/imports" className="w-full sm:w-auto">
            <Button className="w-full" variant="secondary">
              Review imports
            </Button>
          </Link>
          {status?.connected ? (
            <Button
              className="w-full sm:w-auto"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending || status.sync_in_progress}
            >
              {status.sync_in_progress || syncMutation.isPending
                ? "Syncing..."
                : "Sync now"}
            </Button>
          ) : (
            <Button
              className="w-full sm:w-auto"
              onClick={() => setConsentModalOpen(true)}
              disabled={statusQuery.isLoading}
            >
              Connect Gmail
            </Button>
          )}
        </>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-signal/80">
              Safe by design
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              MiniFT only reads bank alert emails
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-mist">
              MiniFT only processes automatic bank alert emails. It never
              accesses your online banking, never asks for banking credentials,
              and only uses Gmail read access to detect activity and help you
              capture spending faster.
            </p>
          </div>

          {googleConnected ? (
            <div className="rounded-[20px] border border-signal/20 bg-signal/10 px-4 py-3 text-sm text-signal">
              Gmail is connected and the first sync has already been scheduled.
            </div>
          ) : null}

          {statusQuery.error instanceof Error ? (
            <div className="rounded-[20px] border border-hazard/20 bg-hazard/10 px-4 py-3 text-sm text-hazard">
              {statusQuery.error.message}
            </div>
          ) : null}

          {!status?.configured ? (
            <div className="rounded-[24px] border border-amber/20 bg-amber/10 p-5 text-sm text-amber">
              This deployment is not configured for Google OAuth and token
              encryption yet. Add `GOOGLE_CLIENT_ID`,
              `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URL`, and
              `GOOGLE_TOKEN_ENCRYPTION_KEY` to enable the integration.
            </div>
          ) : status?.connected ? (
            <div className="grid gap-4">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-mist">
                      Connected Gmail
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {status.google_email}
                    </div>
                  </div>
                  <Badge tone={status.sync_in_progress ? "amber" : "success"}>
                    {status.sync_in_progress ? "Syncing" : "Connected"}
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-[18px] border border-white/10 bg-ink/45 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-mist">
                      Last sync
                    </div>
                    <div className="mt-2 text-sm font-medium text-white">
                      {status.last_synced_at
                        ? formatDateTime(status.last_synced_at)
                        : "Not yet"}
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-white/10 bg-ink/45 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-mist">
                      Imported
                    </div>
                    <div className="mt-2 text-sm font-medium text-white">
                      {status.imported_count}
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-white/10 bg-ink/45 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-mist">
                      Pending review
                    </div>
                    <div className="mt-2 text-sm font-medium text-white">
                      {status.pending_review_count}
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-white/10 bg-ink/45 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-mist">
                      Ready now
                    </div>
                    <div className="mt-2 text-sm font-medium text-white">
                      {status.ready_count}
                    </div>
                  </div>
                </div>
              </div>

              {status.last_error ? (
                <div className="rounded-[20px] border border-amber/20 bg-amber/10 px-4 py-3 text-sm text-amber">
                  Last sync issue: {status.last_error}
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
                      Automation
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      Ready imports and auto-approve
                    </div>
                  </div>
                  <Badge
                    tone={status.auto_approve_ready_imports ? "success" : "amber"}
                  >
                    {status.auto_approve_ready_imports
                      ? "Auto-approve on"
                      : "Manual approval"}
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-mist">
                  MiniFT learns account, merchant, and category rules from each
                  approval. Ready imports stay one click away in the queue, and
                  you can optionally auto-approve future high-confidence
                  imports.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-[18px] border border-white/10 bg-ink/45 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-mist">
                      Ready to approve
                    </div>
                    <div className="mt-2 text-sm font-medium text-white">
                      {status.ready_count}
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-white/10 bg-ink/45 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-mist">
                      Needs attention
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
                      ? "Saving..."
                      : status.auto_approve_ready_imports
                        ? "Disable auto-approve"
                        : "Enable auto-approve"}
                  </Button>
                  <Link href="/imports" className="w-full sm:w-auto">
                    <Button className="w-full sm:w-auto" variant="secondary">
                      Open ready imports
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
                    ? "Syncing..."
                    : "Sync now"}
                </Button>
                <Button
                  className="w-full sm:w-auto"
                  variant="danger"
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                >
                  {disconnectMutation.isPending
                    ? "Disconnecting..."
                    : "Disconnect Gmail"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-mist">
                    Connection status
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    Gmail not connected
                  </div>
                  <p className="mt-2 max-w-xl text-sm text-mist">
                    Connect your Gmail account to let MiniFT review supported
                    bank alerts and create imports for Banco Popular,
                    Banreservas, BHD, Qik, Scotiabank RD, APAP, Asociación
                    Cibao, and Santa Cruz.
                  </p>
                </div>
                <Badge tone="amber">Awaiting consent</Badge>
              </div>

              <div className="mt-5">
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => setConsentModalOpen(true)}
                >
                  Connect Gmail
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Card className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-signal/80">
              Permissions
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Requested scope</h2>
            <p className="mt-2 text-sm text-mist">
              The integration intentionally requests the minimum scope needed to
              read bank alert emails and nothing else.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-mist">
              Gmail readonly
            </div>
            <div className="mt-2 break-all font-medium text-white">
              {status?.scopes[0] ?? GMAIL_SCOPE}
            </div>
            <p className="mt-3 text-sm text-mist">
              MiniFT reads alert messages so it can parse transactions. It does
              not send email, modify Gmail labels, or touch your banking portal.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-mist">
              Review workflow
            </div>
            <p className="mt-2 text-sm text-mist">
              MiniFT now learns from every approval. High-confidence imports can
              stay ready for one-click approval, and you can enable optional
              auto-approve once you trust the learned account and category
              rules.
            </p>
            <div className="mt-4">
              <Link href="/imports" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto" variant="secondary">
                  Open import review
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>

      <Modal
        open={isConsentModalOpen}
        title="Connect Gmail"
        subtitle="MiniFT only reads automatic bank alert emails. It never accesses your online banking."
        onClose={() => setConsentModalOpen(false)}
      >
        <div className="space-y-4 pb-6 text-sm text-mist">
          <p>
            You will be redirected to Google and asked to grant read-only Gmail
            access so MiniFT can process bank alert emails and turn them into
            reviewable imports.
          </p>
          <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-mist">
              Scope requested
            </div>
            <div className="mt-2 break-all font-medium text-white">
              {GMAIL_SCOPE}
            </div>
          </div>
        </div>
        <ModalActions>
          <Button variant="ghost" onClick={() => setConsentModalOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              setConsentModalOpen(false);
              startGoogleConnectFlow();
            }}
          >
            Continue to Google
          </Button>
        </ModalActions>
      </Modal>
    </PageFrame>
  );
}
