import type { ApiMessage } from "@/lib/types";
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  storeAuthTokens,
} from "@/lib/auth-storage";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

function apiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api"
  ).replace(/\/$/, "");
}

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function buildApiUrl(path: string) {
  return `${apiBaseUrl()}${normalizePath(path)}`;
}

function shouldAttachToken(path: string) {
  return !["/auth/login", "/auth/register", "/auth/refresh"].includes(
    normalizePath(path),
  );
}

type AuthResponsePayload = {
  access_token: string;
  refresh_token: string;
};

let refreshRequest: Promise<string | null> | null = null;

async function refreshAccessToken() {
  if (refreshRequest) {
    return refreshRequest;
  }

  refreshRequest = (async () => {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      clearAuthTokens();
      return null;
    }

    const response = await fetch(buildApiUrl("/auth/refresh"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });

    if (!response.ok) {
      clearAuthTokens();
      return null;
    }

    const payload = (await response.json()) as AuthResponsePayload;
    storeAuthTokens(payload.access_token, payload.refresh_token);
    return payload.access_token;
  })();

  try {
    return await refreshRequest;
  } finally {
    refreshRequest = null;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  allowRefresh = true,
): Promise<T> {
  const headers = new Headers(init.headers);
  const hasBody = init.body !== undefined && init.body !== null;
  const normalizedPath = normalizePath(path);

  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (shouldAttachToken(normalizedPath)) {
    const accessToken = getAccessToken();

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
  }

  const response = await fetch(buildApiUrl(normalizedPath), {
    ...init,
    headers,
    cache: "no-store",
  });

  if (
    response.status === 401 &&
    allowRefresh &&
    shouldAttachToken(normalizedPath)
  ) {
    const refreshedAccessToken = await refreshAccessToken();

    if (refreshedAccessToken) {
      const retryHeaders = new Headers(init.headers);

      if (hasBody && !retryHeaders.has("Content-Type")) {
        retryHeaders.set("Content-Type", "application/json");
      }

      retryHeaders.set("Authorization", `Bearer ${refreshedAccessToken}`);

      return request<T>(
        normalizedPath,
        {
          ...init,
          headers: retryHeaders,
        },
        false,
      );
    } else {
      if (typeof window !== "undefined") {
        window.location.href = `/login`;
      }
      throw new ApiError("Session expired", 401);
    }
  }

  if (!response.ok) {
    const details = await parseResponse<Partial<ApiMessage> | string>(response);
    const message =
      typeof details === "string"
        ? details
        : details?.message || details?.error || "Request failed";

    throw new ApiError(message, response.status, details);
  }

  return parseResponse<T>(response);
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
