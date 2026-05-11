"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  ApproveReadyImportsResponse,
  BulkImportActionResponse,
  EmailImportStatus,
  EmailTransactionImport,
} from "@/lib/types";

export function importsQueryKey(status?: EmailImportStatus) {
  return ["imports", status ?? "all"];
}

function buildImportsPath(status?: EmailImportStatus) {
  if (!status) {
    return "/imports";
  }

  return `/imports?status=${encodeURIComponent(status)}`;
}

export function useImportedTransactions(status?: EmailImportStatus) {
  return useQuery({
    queryKey: importsQueryKey(status),
    queryFn: () =>
      api.get<EmailTransactionImport[]>(buildImportsPath(status)),
    placeholderData: (previousData) => previousData,
  });
}

export function useApproveImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      importId,
      payload,
    }: {
      importId: string;
      payload: {
        account_id?: string | null;
        category?: string;
        merchant?: string;
        note?: string;
        create_mapping?: boolean;
        set_bank_default?: boolean;
        save_merchant_rule?: boolean;
        save_category_rule?: boolean;
      };
    }) =>
      api.post<EmailTransactionImport>(`/imports/${importId}/approve`, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["imports"] });
      await queryClient.invalidateQueries({ queryKey: ["integrations", "gmail"] });
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useRejectImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      importId,
      reason,
    }: {
      importId: string;
      reason?: string;
    }) =>
      api.post<EmailTransactionImport>(`/imports/${importId}/reject`, {
        reason,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["imports"] });
      await queryClient.invalidateQueries({ queryKey: ["integrations", "gmail"] });
    },
  });
}

export function useLinkImportAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      importId,
      accountId,
      persistMapping = true,
      setBankDefault = true,
    }: {
      importId: string;
      accountId: string;
      persistMapping?: boolean;
      setBankDefault?: boolean;
    }) =>
      api.post<EmailTransactionImport>(`/imports/${importId}/link-account`, {
        account_id: accountId,
        persist_mapping: persistMapping,
        set_bank_default: setBankDefault,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["imports"] });
    },
  });
}

export function useApproveReadyImports() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api.post<ApproveReadyImportsResponse>("/imports/approve-ready"),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["imports"] });
      await queryClient.invalidateQueries({ queryKey: ["integrations", "gmail"] });
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useIgnoreAllImports() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      importIds,
      reason = "Ignored by user",
    }: {
      importIds: string[];
      reason?: string;
    }) => {
      const results = await Promise.allSettled(
        importIds.map((importId) =>
          api.post<EmailTransactionImport>(`/imports/${importId}/reject`, {
            reason,
          }),
        ),
      );
      const affectedCount = results.filter(
        (result) => result.status === "fulfilled",
      ).length;
      const failedCount = results.length - affectedCount;

      if (affectedCount === 0 && failedCount > 0) {
        const firstFailure = results.find(
          (result) => result.status === "rejected",
        );

        if (firstFailure?.status === "rejected") {
          throw firstFailure.reason;
        }
      }

      return {
        affected_count: affectedCount,
        message:
          failedCount > 0
            ? `Ignored ${affectedCount} imports, ${failedCount} failed`
            : affectedCount === 1
              ? "Ignored 1 import"
              : `Ignored ${affectedCount} imports`,
      } satisfies BulkImportActionResponse;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["imports"] });
      await queryClient.invalidateQueries({ queryKey: ["integrations", "gmail"] });
    },
  });
}
