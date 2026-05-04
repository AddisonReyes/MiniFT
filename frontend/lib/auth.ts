"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { AuthSessionResponse, User } from "@/lib/types";

export const sessionQueryKey = ["auth", "session"];

type AuthResponsePayload = {
  user: User;
};

async function authenticate(
  path: "/auth/login" | "/auth/register",
  payload: { email: string; password: string; currency?: string },
) {
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
  return authenticate("/auth/register", payload);
}

export async function logout() {
  return api.post<{ message: string }>("/auth/logout");
}

export async function updateDefaultCurrency(payload: { currency: string }) {
  return api.put<User>("/auth/me", payload);
}
