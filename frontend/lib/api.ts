import type { ApiMessage } from "@/lib/types";

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

function shouldSkipRefresh(path: string) {
  return [
    "/auth/login",
    "/auth/register",
    "/auth/refresh",
    "/auth/logout",
  ].includes(normalizePath(path));
}

let refreshRequest: Promise<boolean> | null = null;

async function refreshAccessToken() {
  if (refreshRequest) {
    return refreshRequest;
  }

  refreshRequest = (async () => {
    const response = await fetch(buildApiUrl("/auth/refresh"), {
      method: "POST",
      cache: "no-store",
      credentials: "include",
    });

    return response.ok;
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

  const response = await fetch(buildApiUrl(normalizedPath), {
    ...init,
    headers,
    cache: "no-store",
    credentials: "include",
  });

  if (response.status === 401 && allowRefresh && !shouldSkipRefresh(normalizedPath)) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      return request<T>(
        normalizedPath,
        {
          ...init,
          headers,
        },
        false,
      );
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
