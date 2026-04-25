"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { clearAuthTokens, storeAuthTokens } from "@/lib/auth-storage";
import type { AuthSessionResponse, User } from "@/lib/types";

export const sessionQueryKey = ["auth", "session"];

type AuthResponsePayload = {
  user: User;
  access_token: string;
  refresh_token: string;
};

async function authenticate(
  path: "/auth/login" | "/auth/register",
  payload: { email: string; password: string; currency?: string },
) {
  const response = await api.post<AuthResponsePayload>(path, payload);
  storeAuthTokens(response.access_token, response.refresh_token);

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
    staleTime: 60_000,
  });
}

export function login(payload: { email: string; password: string }) {
  return authenticate("/auth/login", payload);
}

export function register(payload: {
  email: string;
  password: string;
  currency: string;
}) {
  return authenticate("/auth/register", payload);
}

export function logout() {
  clearAuthTokens();

  return Promise.resolve({ message: "Signed out" });
}
