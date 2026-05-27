"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  GmailIntegrationStatus,
  GoogleConnectUrlResponse,
  MessageResponse,
} from "@/lib/types";

export const gmailIntegrationQueryKey = ["integrations", "gmail"];

export function useGmailIntegration(enabled = true) {
  return useQuery({
    queryKey: gmailIntegrationQueryKey,
    queryFn: () => api.get<GmailIntegrationStatus>("/integrations/gmail"),
    refetchInterval: (query) =>
      query.state.data?.sync_in_progress ? 3_000 : false,
    enabled,
  });
}

export function startGoogleConnectFlow() {
  return api
    .get<GoogleConnectUrlResponse>("/integrations/google/connect-url")
    .then((response) => {
      if (typeof window === "undefined") {
        return;
      }

      window.location.assign(response.authorization_url);
    });
}

export function useGoogleConnect() {
  return useMutation({
    mutationFn: startGoogleConnectFlow,
  });
}

export function useSyncImports() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api.post<GmailIntegrationStatus>("/integrations/gmail/sync"),
    onSuccess: async (status) => {
      await queryClient.setQueryData(gmailIntegrationQueryKey, status);
      await queryClient.invalidateQueries({ queryKey: gmailIntegrationQueryKey });
      await queryClient.invalidateQueries({ queryKey: ["imports"] });
    },
  });
}

export function useDisconnectGmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api.delete<MessageResponse>("/integrations/google/disconnect"),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: gmailIntegrationQueryKey });
      await queryClient.invalidateQueries({ queryKey: ["imports"] });
    },
  });
}

export function useUpdateGmailPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (autoApproveReadyImports: boolean) =>
      api.put<GmailIntegrationStatus>("/integrations/gmail/preferences", {
        auto_approve_ready_imports: autoApproveReadyImports,
      }),
    onSuccess: async (status) => {
      await queryClient.setQueryData(gmailIntegrationQueryKey, status);
      await queryClient.invalidateQueries({ queryKey: gmailIntegrationQueryKey });
      await queryClient.invalidateQueries({ queryKey: ["imports"] });
    },
  });
}
