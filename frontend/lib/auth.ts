"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  AuthSessionResponse,
  MessageResponse,
  RegistrationResponse,
  User,
} from "@/lib/types";

export const sessionQueryKey = ["auth", "session"];

type AuthResponsePayload = {
  user: User;
};

async function authenticate(path: "/auth/login", payload: { email: string; password: string }) {
  const response = await api.post<AuthResponsePayload>(path, payload);

  return {
    user: response.user,
  } satisfies AuthSessionResponse;
}

export function useSessionQuery() {
  return useQuery({
    queryKey: sessionQueryKey,
    queryFn: async () => {
      const user = await api.get<User>("/auth/me");
      return user;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export async function login(payload: { email: string; password: string }) {
  return authenticate("/auth/login", payload);
}

export async function register(payload: {
  email: string;
  password: string;
  currency: string;
}) {
  return api.post<RegistrationResponse>("/auth/register", payload);
}

export async function resendVerificationEmail(payload: { email: string }) {
  return api.post<MessageResponse>("/auth/register/resend-verification", payload);
}

export async function verifyEmail(payload: { token: string }) {
  const response = await api.post<AuthResponsePayload>("/auth/verify-email", payload);

  return {
    user: response.user,
  } satisfies AuthSessionResponse;
}

export async function requestPasswordReset(payload: { email: string }) {
  return api.post<MessageResponse>("/auth/password/reset/request", payload);
}

export async function confirmPasswordReset(payload: {
  email: string;
  code: string;
  password: string;
  password_confirmation: string;
}) {
  return api.post<MessageResponse>("/auth/password/reset/confirm", payload);
}

export async function requestPasswordChange() {
  return api.post<MessageResponse>("/auth/password/change/request");
}

export async function confirmPasswordChange(payload: {
  code: string;
  password: string;
  password_confirmation: string;
}) {
  const response = await api.post<AuthResponsePayload>(
    "/auth/password/change/confirm",
    payload,
  );

  return {
    user: response.user,
  } satisfies AuthSessionResponse;
}

export async function logout() {
  return api.post<MessageResponse>("/auth/logout");
}

export async function updateDefaultCurrency(payload: { currency: string }) {
  return api.put<User>("/auth/me", payload);
}
