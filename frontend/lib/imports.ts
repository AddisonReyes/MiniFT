"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
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
    }: {
      importId: string;
      accountId: string;
      persistMapping?: boolean;
    }) =>
      api.post<EmailTransactionImport>(`/imports/${importId}/link-account`, {
        account_id: accountId,
        persist_mapping: persistMapping,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["imports"] });
    },
  });
}
