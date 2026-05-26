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
import { useTranslation } from "react-i18next";

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

function confidenceLabel(score: number, t: (key: string) => string) {
  if (score >= 80) {
    return t("importsPage.confidence.high");
  }

  if (score >= 50) {
    return t("importsPage.confidence.medium");
  }

  return t("importsPage.confidence.low");
}

export default function ImportsPage() {
  const { t } = useTranslation();
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
      title={t("imports.title")}
      description={t("imports.description")}
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
                ? t("importsPage.ignoring")
                : t("importsPage.ignoreAll", { count: pendingReviewImports.length })}
            </Button>
            <Button
              className="w-full sm:w-auto"
              disabled={readyImports.length === 0 || approveReadyMutation.isPending}
              onClick={() => approveReadyMutation.mutate()}
            >
              {approveReadyMutation.isPending
                ? t("importsPage.approving")
                : t("importsPage.approveAllReady", { count: readyImports.length })}
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
                {t("importsPage.importQueue")}
               </p>
               <h2 className="mt-2 text-2xl font-semibold">{t("importsPage.reviewTitle")}</h2>
               <p className="mt-2 text-sm text-mist">
                 {t("importsPage.reviewDescription")}
               </p>
            </div>
          </div>

          <SegmentedControl
            options={[
              { label: t("importsPage.pendingReview"), value: "pending_review" },
              { label: t("importsPage.imported"), value: "imported" },
              { label: t("importsPage.failed"), value: "failed" },
            ]}
            value={activeStatus}
            onChange={(value) => setActiveStatus(value as EmailImportStatus)}
          />

          {activeStatus === "pending_review" ? (
            <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[24px] border border-signal/20 bg-signal/10 p-5">
                <div className="text-xs uppercase tracking-[0.18em] text-signal">
                   {t("importsPage.readyQueue")}
                 </div>
                 <h3 className="mt-2 text-lg font-semibold text-white">
                   {readyImports.length === 0
                     ? t("importsPage.noReadyImports")
                     : t("importsPage.readyImports_other", { count: readyImports.length })}
                 </h3>
                 <p className="mt-2 text-sm text-mist">
                   {t("importsPage.readyDescription")}
                 </p>
               </div>

               <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                 <div className="text-xs uppercase tracking-[0.18em] text-mist">
                   {t("importsPage.learningMode")}
                 </div>
                 <p className="mt-2 text-sm text-mist">
                   {t("importsPage.learningDescription")}
                 </p>
                <div className="mt-4 grid gap-3 min-[380px]:grid-cols-2">
                  <div className="rounded-[18px] border border-white/10 bg-ink/45 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-mist">
                      {t("importsPage.needsAttention")}
                    </div>
                    <div className="mt-2 text-sm font-medium text-white">
                      {needsAttentionCount}
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-white/10 bg-ink/45 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-mist">
                       {t("importsPage.totalPending")}
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
          <Card className="text-mist">{t("importsPage.loading")}</Card>
        ) : imports.length === 0 ? (
          <Card className="text-mist">{t("importsPage.empty")}</Card>
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
                    <div className="min-w-0">
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
                        {readyPendingImport ? <Badge tone="success">{t("importsPage.status.ready")}</Badge> : null}
                         {importItem.auto_approved ? (
                           <Badge tone="success">{t("importsPage.status.autoApproved")}</Badge>
                         ) : null}
                         <Badge tone={confidenceTone(importItem.confidence_score)}>
                           {confidenceLabel(importItem.confidence_score, t)}
                         </Badge>
                        <span className="mobile-safe-text text-xs uppercase tracking-[0.16em] text-mist sm:tracking-[0.18em]">
                          {importItem.bank_name}
                        </span>
                      </div>
                      <h3 className="mobile-safe-text mt-3 text-xl font-semibold text-white">
                        {parsed?.merchant || importItem.email_subject}
                      </h3>
                      <p className="mobile-safe-text mt-2 text-sm text-mist">
                        {formatDateTime(importItem.email_date)} from{" "}
                        {importItem.sender_email}
                      </p>
                    </div>

                    {parsed ? (
                      <div className="flex w-full min-w-0 items-center justify-between gap-3 rounded-[20px] border border-white/10 bg-ink/45 px-4 py-3 md:w-auto md:min-w-[12rem] md:block md:text-right">
                        <div className="text-xs uppercase tracking-[0.18em] text-mist md:mb-2">
                           {t("transactions.list.amount")}
                         </div>
                        <div className="mobile-safe-text text-lg font-semibold text-white">
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
                         ? t("importsPage.readyHint")
                         : t("importsPage.needsAttentionHint")}
                    </div>
                  ) : null}

                  {importItem.raw_email_snippet ? (
                    <div className="mobile-safe-text rounded-[20px] border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-mist">
                      {importItem.raw_email_snippet}
                    </div>
                  ) : null}

                  {parsed && showExpandedEditor ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label htmlFor={`category-${importItem.id}`}>
                           {t("transactions.list.category")}
                         </label>
                         <Input
                           id={`category-${importItem.id}`}
                           placeholder={t("importsPage.categoryPlaceholder")}
                          value={draft.category}
                          onChange={(event) =>
                            updateDraft(importItem, {
                              category: event.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor={`account-${importItem.id}`}>{t("importsPage.accountLabel")}</label>
                        <Select
                          id={`account-${importItem.id}`}
                          value={selectedAccountId}
                          onChange={(event) =>
                            updateDraft(importItem, {
                              accountId: event.target.value,
                            })
                          }
                        >
                           <option value="">{t("common.selectAccount")}</option>
                          {accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-3 text-sm text-mist min-[380px]:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-[18px] border border-white/10 bg-ink/45 p-4">
                       <div className="text-xs uppercase tracking-[0.18em] text-mist">
                         {t("importsPage.cardHint")}
                       </div>
                       <div className="mobile-safe-text mt-2 text-white">
                         {parsed?.card_last4
                           ? `•••• ${parsed.card_last4}`
                           : parsed?.account_hint || t("common.unknown")}
                       </div>
                     </div>
                     <div className="rounded-[18px] border border-white/10 bg-ink/45 p-4">
                       <div className="text-xs uppercase tracking-[0.18em] text-mist">
                         {t("importsPage.linkedAccount")}
                       </div>
                       <div className="mobile-safe-text mt-2 text-white">
                         {importItem.matched_account_name || t("common.needsConfirmation")}
                       </div>
                     </div>
                    <div className="rounded-[18px] border border-white/10 bg-ink/45 p-4">
                       <div className="text-xs uppercase tracking-[0.18em] text-mist">
                         {t("importsPage.suggestedCategory")}
                       </div>
                       <div className="mobile-safe-text mt-2 text-white">
                         {importItem.suggested_category || t("common.needsConfirmation")}
                       </div>
                     </div>
                     <div className="rounded-[18px] border border-white/10 bg-ink/45 p-4">
                       <div className="text-xs uppercase tracking-[0.18em] text-mist">
                         {t("importsPage.confidence_label")}
                       </div>
                       <div className="mobile-safe-text mt-2 text-white">
                        {importItem.confidence_score} / 100
                      </div>
                    </div>
                  </div>

                  {importItem.account_match_reason || importItem.category_match_reason ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {importItem.account_match_reason ? (
                        <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4 text-sm text-mist">
                           <div className="text-xs uppercase tracking-[0.18em] text-mist">
                             {t("importsPage.accountMatch")}
                           </div>
                          <div className="mobile-safe-text mt-2 text-white">
                            {importItem.account_match_reason}
                          </div>
                        </div>
                      ) : null}
                      {importItem.category_match_reason ? (
                        <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4 text-sm text-mist">
                           <div className="text-xs uppercase tracking-[0.18em] text-mist">
                             {t("importsPage.categoryReason")}
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
                             {showExpandedEditor ? t("importsPage.hideDetails") : t("importsPage.adjustDetails")}
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
                           {isLinking ? t("importsPage.linking") : t("importsPage.linkAccount")}
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
                           {isApproving ? t("importsPage.approving") : t("importsPage.approveImport")}
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
                           {isRejecting ? t("importsPage.ignoring") : t("importsPage.ignore")}
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
                         {isRejecting ? t("importsPage.dismissing") : t("importsPage.dismiss")}
                       </Button>
                     ) : (
                       <div className="mobile-safe-text text-sm text-mist">
                         {importItem.matched_account_name
                           ? t("importsPage.transactionCreatedIn", { account: importItem.matched_account_name })
                           : t("importsPage.transactionCreated")}
                         {importItem.auto_approved
                           ? t("importsPage.transactionAutoApproved")
                           : t("importsPage.transactionManual")}
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
