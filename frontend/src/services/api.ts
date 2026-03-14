const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

type EntryType = "INCOME" | "EXPENSE";
type Currency = "USD" | "EUR" | "MXN" | "DOP";
type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

type LoginResponse = {
  message: string;
  id: number;
  token: string;
  expires_at?: string;
};

export type Entry = {
  id: number;
  name: string;
  date: string;
  amount: string;
  currency: Currency;
  entry_type: EntryType;
  is_recurring: boolean;
  recurring: {
    frequency: RecurrenceFrequency;
    repeat_every: number;
    repetitions: number;
  } | null;
};

export type BalanceSummary = {
  total_income: string | number;
  total_expense: string | number;
  balance: string | number;
};

function getToken() {
  return localStorage.getItem("token");
}

async function apiFetch(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const token = getToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  const data = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const message =
      typeof data === "object" && data && "error" in data
        ? String((data as { error?: unknown }).error)
        : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export async function signIn(email: string, password: string) {
  const data = (await apiFetch("/api/auth/login/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  })) as LoginResponse;

  if (!data?.token) throw new Error("Login response missing token");

  localStorage.setItem("token", data.token);
  if (data.expires_at) {
    localStorage.setItem("token_expires_at", data.expires_at);
  }
  localStorage.setItem("user_id", String(data.id));

  return data;
}

export async function signUp(email: string, password: string) {
  return apiFetch("/api/auth/register/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
}

export async function signOut() {
  try {
    await apiFetch("/api/auth/logout/", { method: "POST" });
  } finally {
    localStorage.removeItem("token");
    localStorage.removeItem("token_expires_at");
    localStorage.removeItem("user_id");
  }
}

export async function getBalanceSummary() {
  return apiFetch("/api/finances/entries/summary/") as Promise<BalanceSummary>;
}

export async function listEntries(entryType?: EntryType) {
  const qs = entryType ? `?type=${encodeURIComponent(entryType)}` : "";
  const data = (await apiFetch(`/api/finances/entries/${qs}`)) as {
    entries: Entry[];
  };
  return data.entries;
}

export type CreateEntryInput = {
  name: string;
  date: string;
  amount: string;
  currency: Currency;
  entry_type: EntryType;
  is_recurring?: boolean;
  recurring_data?: {
    frequency: RecurrenceFrequency;
    repeat_every: number;
    repetitions: number;
  };
};

export async function createEntry(input: CreateEntryInput) {
  return apiFetch("/api/finances/entries/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  }) as Promise<{ message: string; id: number }>;
}

export async function deleteEntry(id: number) {
  return apiFetch(`/api/finances/entries/${id}/`, {
    method: "DELETE",
  }) as Promise<{ message: string }>;
}
