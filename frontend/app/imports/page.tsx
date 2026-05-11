"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { PageFrame } from "@/components/page-frame";
import {
  Badge,
  Button,
  Card,
  Input,
  Select,
  SegmentedControl,
} from "@/components/ui";
import { api } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  useApproveImport,
  useApproveReadyImports,
  useIgnoreAllImports,
  useImportedTransactions,
  useLinkImportAccount,
  useRejectImport,
} from "@/lib/imports";
import type {
  Account,
  EmailImportStatus,
  EmailTransactionImport,
} from "@/lib/types";

type ImportDraft = {
  accountId: string;
  category: string;
};

function mergeDraft(
  importItem: EmailTransactionImport,
  current?: Partial<ImportDraft>,
): ImportDraft {
  return {
    accountId: current?.accountId ?? importItem.matched_account_id ?? "",
    category:
      current?.category ??
      importItem.suggested_category ??
      importItem.parsed_transaction?.merchant ??
      "",
  };
}

function isReadyPendingImport(importItem: EmailTransactionImport) {
  return (
    importItem.status === "pending_review" &&
    importItem.ready_to_approve
  );
}

function confidenceTone(score: number): "success" | "amber" | "danger" {
  if (score >= 80) {
    return "success";
  }

  if (score >= 50) {
    return "amber";
  }

  return "danger";
}

function confidenceLabel(score: number) {
  if (score >= 80) {
    return "High confidence";
  }

  if (score >= 50) {
    return "Medium confidence";
  }

  return "Low confidence";
}

export default function ImportsPage() {
  const [activeStatus, setActiveStatus] =
    useState<EmailImportStatus>("pending_review");
  const [drafts, setDrafts] = useState<Record<string, ImportDraft>>({});
  const [expandedReadyImports, setExpandedReadyImports] = useState<
    Record<string, boolean>
  >({});
  const importsQuery = useImportedTransactions(activeStatus);
  const approveMutation = useApproveImport();
  const approveReadyMutation = useApproveReadyImports();
  const ignoreAllMutation = useIgnoreAllImports();
  const rejectMutation = useRejectImport();
  const linkAccountMutation = useLinkImportAccount();
  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: () => api.get<Account[]>("/accounts"),
    placeholderData: (previousData) => previousData,
  });
  const accounts = accountsQuery.data ?? [];
  const imports = importsQuery.data ?? [];
  const readyImports = imports.filter(isReadyPendingImport);
  const pendingReviewImports = imports.filter(
    (importItem) => importItem.status === "pending_review",
  );
  const needsAttentionCount = imports.filter(
    (importItem) =>
      importItem.status === "pending_review" && !importItem.ready_to_approve,
  ).length;

  function getDraft(importItem: EmailTransactionImport) {
    return mergeDraft(importItem, drafts[importItem.id]);
  }

  function updateDraft(
    importItem: EmailTransactionImport,
    partial: Partial<ImportDraft>,
  ) {
    setDrafts((current) => ({
      ...current,
      [importItem.id]: {
        ...mergeDraft(importItem, current[importItem.id]),
        ...partial,
      },
    }));
  }

  function toggleReadyDetails(importId: string) {
    setExpandedReadyImports((current) => ({
      ...current,
      [importId]: !current[importId],
    }));
  }

  return (
    <PageFrame
      title="Imports"
      description="Review Gmail-derived bank alerts, confirm the occasional edge case, and let MiniFT learn account, merchant, and category patterns from each approval."
      actions={
        activeStatus === "pending_review" ? (
          <>
            <Button
              className="w-full sm:w-auto"
              variant="secondary"
              disabled={
                pendingReviewImports.length === 0 || ignoreAllMutation.isPending
              }
              onClick={() =>
                ignoreAllMutation.mutate({
                  importIds: pendingReviewImports.map((importItem) => importItem.id),
                })
              }
            >
              {ignoreAllMutation.isPending
                ? "Ignoring..."
                : `Ignore all (${pendingReviewImports.length})`}
            </Button>
            <Button
              className="w-full sm:w-auto"
              disabled={readyImports.length === 0 || approveReadyMutation.isPending}
              onClick={() => approveReadyMutation.mutate()}
            >
              {approveReadyMutation.isPending
                ? "Approving..."
                : `Approve all ready (${readyImports.length})`}
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="space-y-6">
        <Card className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-signal/80">
                Import queue
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Review Gmail imports</h2>
              <p className="mt-2 text-sm text-mist">
                Ready imports already have an account match and a category
                pulled from the email merchant. Items that still need attention
                usually only need a quick account confirmation or small text
                adjustment.
              </p>
            </div>
          </div>

          <SegmentedControl
            options={[
              { label: "Pending Review", value: "pending_review" },
              { label: "Imported", value: "imported" },
              { label: "Failed", value: "failed" },
            ]}
            value={activeStatus}
            onChange={(value) => setActiveStatus(value as EmailImportStatus)}
          />

          {activeStatus === "pending_review" ? (
            <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[24px] border border-signal/20 bg-signal/10 p-5">
                <div className="text-xs uppercase tracking-[0.18em] text-signal">
                  Ready queue
                </div>
                <h3 className="mt-2 text-lg font-semibold text-white">
                  {readyImports.length === 0
                    ? "No imports are ready yet"
                    : `${readyImports.length} import${readyImports.length === 1 ? "" : "s"} can be approved right away`}
                </h3>
                <p className="mt-2 text-sm text-mist">
                  MiniFT already matched the account and prepared a category
                  from the bank email for these imports.
                </p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <div className="text-xs uppercase tracking-[0.18em] text-mist">
                  Learning mode
                </div>
                <p className="mt-2 text-sm text-mist">
                  Every approval teaches MiniFT the preferred account and
                  category for similar bank alerts.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-[18px] border border-white/10 bg-ink/45 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-mist">
                      Needs attention
                    </div>
                    <div className="mt-2 text-sm font-medium text-white">
                      {needsAttentionCount}
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-white/10 bg-ink/45 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-mist">
                      Total pending
                    </div>
                    <div className="mt-2 text-sm font-medium text-white">
                      {imports.length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </Card>

        {importsQuery.error instanceof Error ? (
          <Card className="border-hazard/20 bg-hazard/5 text-hazard">
            {importsQuery.error.message}
          </Card>
        ) : null}

        {approveReadyMutation.error instanceof Error ? (
          <Card className="border-hazard/20 bg-hazard/5 text-hazard">
            {approveReadyMutation.error.message}
          </Card>
        ) : null}

        {ignoreAllMutation.error instanceof Error ? (
          <Card className="border-hazard/20 bg-hazard/5 text-hazard">
            {ignoreAllMutation.error.message}
          </Card>
        ) : null}

        {approveReadyMutation.data ? (
          <Card className="border-signal/20 bg-signal/10 text-signal">
            {approveReadyMutation.data.message}
          </Card>
        ) : null}

        {ignoreAllMutation.data ? (
          <Card className="border-signal/20 bg-signal/10 text-signal">
            {ignoreAllMutation.data.message}
          </Card>
        ) : null}

        {importsQuery.isLoading ? (
          <Card className="text-mist">Loading imports...</Card>
        ) : imports.length === 0 ? (
          <Card className="text-mist">No imports in this tab yet.</Card>
        ) : (
          <div className="grid gap-4">
            {imports.map((importItem) => {
              const draft = getDraft(importItem);
              const parsed = importItem.parsed_transaction;
              const selectedAccountId =
                draft.accountId || importItem.matched_account_id || "";
              const readyPendingImport = isReadyPendingImport(importItem);
              const showExpandedEditor =
                !readyPendingImport || expandedReadyImports[importItem.id] === true;
              const isApproving =
                approveMutation.isPending &&
                approveMutation.variables?.importId === importItem.id;
              const isRejecting =
                rejectMutation.isPending &&
                rejectMutation.variables?.importId === importItem.id;
              const isLinking =
                linkAccountMutation.isPending &&
                linkAccountMutation.variables?.importId === importItem.id;

              return (
                <Card key={importItem.id} className="space-y-4 sm:space-y-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge
                          tone={
                            importItem.status === "failed"
                              ? "danger"
                              : importItem.status === "imported"
                                ? "success"
                                : "amber"
                          }
                        >
                          {importItem.status.replace("_", " ")}
                        </Badge>
                        {readyPendingImport ? <Badge tone="success">Ready</Badge> : null}
                        {importItem.auto_approved ? (
                          <Badge tone="success">Auto-approved</Badge>
                        ) : null}
                        <Badge tone={confidenceTone(importItem.confidence_score)}>
                          {confidenceLabel(importItem.confidence_score)}
                        </Badge>
                        <span className="text-xs uppercase tracking-[0.18em] text-mist">
                          {importItem.bank_name}
                        </span>
                      </div>
                      <h3 className="mt-3 text-xl font-semibold text-white">
                        {parsed?.merchant || importItem.email_subject}
                      </h3>
                      <p className="mt-2 text-sm text-mist">
                        {formatDateTime(importItem.email_date)} from{" "}
                        {importItem.sender_email}
                      </p>
                    </div>

                    {parsed ? (
                      <div className="flex w-full items-center justify-between rounded-[20px] border border-white/10 bg-ink/45 px-4 py-3 md:w-auto md:min-w-[12rem] md:block md:text-right">
                        <div className="text-xs uppercase tracking-[0.18em] text-mist md:mb-2">
                          Parsed amount
                        </div>
                        <div className="text-lg font-semibold text-white">
                          {formatCurrency(parsed.amount, parsed.currency)}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {importItem.status === "pending_review" ? (
                    <div
                      className={
                        readyPendingImport
                          ? "rounded-[20px] border border-signal/20 bg-signal/10 px-4 py-3 text-sm text-signal"
                          : "rounded-[20px] border border-amber/20 bg-amber/10 px-4 py-3 text-sm text-amber"
                      }
                    >
                      {readyPendingImport
                        ? "This import is fully prefilled and ready for a one-click approval."
                        : "This import still needs a quick confirmation before MiniFT can create the transaction."}
                    </div>
                  ) : null}

                  {importItem.raw_email_snippet ? (
                    <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-mist">
                      {importItem.raw_email_snippet}
                    </div>
                  ) : null}

                  {parsed && showExpandedEditor ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label htmlFor={`category-${importItem.id}`}>
                          Category
                        </label>
                        <Input
                          id={`category-${importItem.id}`}
                          placeholder="Leave blank to use the suggested category"
                          value={draft.category}
                          onChange={(event) =>
                            updateDraft(importItem, {
                              category: event.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor={`account-${importItem.id}`}>Account</label>
                        <Select
                          id={`account-${importItem.id}`}
                          value={selectedAccountId}
                          onChange={(event) =>
                            updateDraft(importItem, {
                              accountId: event.target.value,
                            })
                          }
                        >
                          <option value="">Select an account</option>
                          {accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-3 text-sm text-mist xl:grid-cols-4">
                    <div className="rounded-[18px] border border-white/10 bg-ink/45 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-mist">
                        Card / hint
                      </div>
                      <div className="mt-2 text-white">
                        {parsed?.card_last4
                          ? `•••• ${parsed.card_last4}`
                          : parsed?.account_hint || "Unknown"}
                      </div>
                    </div>
                    <div className="rounded-[18px] border border-white/10 bg-ink/45 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-mist">
                        Linked account
                      </div>
                      <div className="mt-2 text-white">
                        {importItem.matched_account_name || "Needs confirmation"}
                      </div>
                    </div>
                    <div className="rounded-[18px] border border-white/10 bg-ink/45 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-mist">
                        Suggested category
                      </div>
                      <div className="mt-2 text-white">
                        {importItem.suggested_category || "Needs confirmation"}
                      </div>
                    </div>
                    <div className="rounded-[18px] border border-white/10 bg-ink/45 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-mist">
                        Confidence
                      </div>
                      <div className="mt-2 text-white">
                        {importItem.confidence_score} / 100
                      </div>
                    </div>
                  </div>

                  {importItem.account_match_reason || importItem.category_match_reason ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {importItem.account_match_reason ? (
                        <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4 text-sm text-mist">
                          <div className="text-xs uppercase tracking-[0.18em] text-mist">
                            Account match
                          </div>
                          <div className="mt-2 text-white">
                            {importItem.account_match_reason}
                          </div>
                        </div>
                      ) : null}
                      {importItem.category_match_reason ? (
                        <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4 text-sm text-mist">
                          <div className="text-xs uppercase tracking-[0.18em] text-mist">
                            Category suggestion
                          </div>
                          <div className="mt-2 text-white">
                            {importItem.category_match_reason}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {importItem.parsing_error ? (
                    <div className="rounded-[20px] border border-amber/20 bg-amber/10 px-4 py-3 text-sm text-amber">
                      {importItem.parsing_error}
                    </div>
                  ) : null}

                  <div className="grid gap-3 sm:flex sm:flex-wrap">
                    {activeStatus === "pending_review" ? (
                      <>
                        {readyPendingImport ? (
                          <Button
                            className="w-full sm:w-auto"
                            variant="secondary"
                            onClick={() => toggleReadyDetails(importItem.id)}
                          >
                            {showExpandedEditor ? "Hide details" : "Adjust details"}
                          </Button>
                        ) : null}
                        <Button
                          className="w-full sm:w-auto"
                          variant="secondary"
                          disabled={!selectedAccountId || isLinking}
                          onClick={() =>
                            linkAccountMutation.mutate({
                              importId: importItem.id,
                              accountId: selectedAccountId,
                              setBankDefault: true,
                            })
                          }
                        >
                          {isLinking ? "Linking..." : "Link account"}
                        </Button>
                        <Button
                          className="w-full sm:w-auto"
                          disabled={!selectedAccountId || isApproving}
                          onClick={() =>
                            approveMutation.mutate({
                              importId: importItem.id,
                              payload: {
                                account_id: selectedAccountId,
                                category: draft.category || undefined,
                                create_mapping: true,
                                set_bank_default: true,
                                save_category_rule: true,
                              },
                            })
                          }
                        >
                          {isApproving ? "Approving..." : "Approve import"}
                        </Button>
                        <Button
                          className="w-full sm:w-auto"
                          variant="ghost"
                          disabled={isRejecting}
                          onClick={() =>
                            rejectMutation.mutate({
                              importId: importItem.id,
                              reason: "Ignored by user",
                            })
                          }
                        >
                          {isRejecting ? "Ignoring..." : "Ignore"}
                        </Button>
                      </>
                    ) : activeStatus === "failed" ? (
                      <Button
                        className="w-full sm:w-auto"
                        variant="ghost"
                        disabled={isRejecting}
                        onClick={() =>
                          rejectMutation.mutate({
                            importId: importItem.id,
                            reason: "Dismissed after review",
                          })
                        }
                      >
                        {isRejecting ? "Dismissing..." : "Dismiss"}
                      </Button>
                    ) : (
                      <div className="text-sm text-mist">
                        Transaction created
                        {importItem.matched_account_name
                          ? ` in ${importItem.matched_account_name}`
                          : ""}
                        {importItem.auto_approved
                          ? " automatically after MiniFT matched the account and category."
                          : "."}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageFrame>
  );
}
