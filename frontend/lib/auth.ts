"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { AuthSessionResponse, User } from "@/lib/types";

export const sessionQueryKey = ["auth", "session"];

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
  return api.post<AuthSessionResponse>("/auth/login", payload);
}

export function register(payload: {
  email: string;
  password: string;
  currency: string;
}) {
  return api.post<AuthSessionResponse>("/auth/register", payload);
}

export function logout() {
  return api.post<{ message: string }>("/auth/logout");
}

