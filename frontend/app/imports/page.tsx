"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { PageFrame } from "@/components/page-frame";
import { Badge, Button, Card, Input, Select, SegmentedControl } from "@/components/ui";
import { api } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  useApproveImport,
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
  merchant: string;
  category: string;
};

function createDraft(importItem: EmailTransactionImport): ImportDraft {
  return {
    accountId: importItem.matched_account_id ?? "",
    merchant: importItem.parsed_transaction?.merchant ?? "",
    category: "",
  };
}

export default function ImportsPage() {
  const [activeStatus, setActiveStatus] =
    useState<EmailImportStatus>("pending_review");
  const [drafts, setDrafts] = useState<Record<string, ImportDraft>>({});
  const importsQuery = useImportedTransactions(activeStatus);
  const approveMutation = useApproveImport();
  const rejectMutation = useRejectImport();
  const linkAccountMutation = useLinkImportAccount();
  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: () => api.get<Account[]>("/accounts"),
    placeholderData: (previousData) => previousData,
  });
  const accounts = accountsQuery.data ?? [];
  const imports = importsQuery.data ?? [];

  function getDraft(importItem: EmailTransactionImport) {
    return drafts[importItem.id] ?? createDraft(importItem);
  }

  function updateDraft(importId: string, partial: Partial<ImportDraft>) {
    setDrafts((current) => ({
      ...current,
      [importId]: {
        ...(current[importId] ?? { accountId: "", merchant: "", category: "" }),
        ...partial,
      },
    }));
  }

  return (
    <PageFrame
      title="Imports"
      description="Review Gmail-derived bank alerts, confirm unknown account mappings, adjust merchant/category details, and decide which imported transactions should land in MiniFT."
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
                Pending items need account confirmation. Imported items were
                created automatically or approved manually. Failed items need a
                parser adjustment or can be ignored.
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
        </Card>

        {importsQuery.error instanceof Error ? (
          <Card className="border-hazard/20 bg-hazard/5 text-hazard">
            {importsQuery.error.message}
          </Card>
        ) : null}

        {importsQuery.isLoading ? (
          <Card className="text-mist">Loading imports...</Card>
        ) : imports.length === 0 ? (
          <Card className="text-mist">
            No imports in this tab yet.
          </Card>
        ) : (
          <div className="grid gap-4">
            {imports.map((importItem) => {
              const draft = getDraft(importItem);
              const parsed = importItem.parsed_transaction;
              const selectedAccountId =
                draft.accountId || importItem.matched_account_id || "";

              return (
                <Card key={importItem.id} className="space-y-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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
                      <div className="rounded-[20px] border border-white/10 bg-ink/45 px-4 py-3 text-right">
                        <div className="text-xs uppercase tracking-[0.18em] text-mist">
                          Parsed amount
                        </div>
                        <div className="mt-2 text-lg font-semibold text-white">
                          {formatCurrency(parsed.amount, parsed.currency)}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {importItem.raw_email_snippet ? (
                    <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4 text-sm text-mist">
                      {importItem.raw_email_snippet}
                    </div>
                  ) : null}

                  {parsed ? (
                    <div className="grid gap-4 lg:grid-cols-[1fr_1fr_0.8fr]">
                      <div className="space-y-2">
                        <label htmlFor={`merchant-${importItem.id}`}>Merchant</label>
                        <Input
                          id={`merchant-${importItem.id}`}
                          value={draft.merchant}
                          onChange={(event) =>
                            updateDraft(importItem.id, {
                              merchant: event.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor={`category-${importItem.id}`}>
                          Category override
                        </label>
                        <Input
                          id={`category-${importItem.id}`}
                          placeholder="Leave blank to auto-categorize"
                          value={draft.category}
                          onChange={(event) =>
                            updateDraft(importItem.id, {
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
                            updateDraft(importItem.id, {
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

                  <div className="grid gap-3 text-sm text-mist sm:grid-cols-3">
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
                        Parser state
                      </div>
                      <div className="mt-2 text-white">
                        {importItem.parsed_successfully ? "Parsed" : "Needs attention"}
                      </div>
                    </div>
                  </div>

                  {importItem.parsing_error ? (
                    <div className="rounded-[20px] border border-amber/20 bg-amber/10 px-4 py-3 text-sm text-amber">
                      {importItem.parsing_error}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    {activeStatus === "pending_review" ? (
                      <>
                        <Button
                          variant="secondary"
                          disabled={
                            !selectedAccountId || linkAccountMutation.isPending
                          }
                          onClick={() =>
                            linkAccountMutation.mutate({
                              importId: importItem.id,
                              accountId: selectedAccountId,
                            })
                          }
                        >
                          {linkAccountMutation.isPending
                            ? "Linking..."
                            : "Link account"}
                        </Button>
                        <Button
                          disabled={
                            !selectedAccountId || approveMutation.isPending
                          }
                          onClick={() =>
                            approveMutation.mutate({
                              importId: importItem.id,
                              payload: {
                                account_id: selectedAccountId,
                                merchant: draft.merchant || undefined,
                                category: draft.category || undefined,
                                create_mapping: true,
                              },
                            })
                          }
                        >
                          {approveMutation.isPending
                            ? "Approving..."
                            : "Approve import"}
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={rejectMutation.isPending}
                          onClick={() =>
                            rejectMutation.mutate({
                              importId: importItem.id,
                              reason: "Ignored by user",
                            })
                          }
                        >
                          {rejectMutation.isPending ? "Ignoring..." : "Ignore"}
                        </Button>
                      </>
                    ) : activeStatus === "failed" ? (
                      <Button
                        variant="ghost"
                        disabled={rejectMutation.isPending}
                        onClick={() =>
                          rejectMutation.mutate({
                            importId: importItem.id,
                            reason: "Dismissed after review",
                          })
                        }
                      >
                        {rejectMutation.isPending ? "Dismissing..." : "Dismiss"}
                      </Button>
                    ) : (
                      <div className="text-sm text-mist">
                        Transaction created{importItem.matched_account_name
                          ? ` in ${importItem.matched_account_name}`
                          : ""}.
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
