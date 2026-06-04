import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, api, buildRawApiUrl } from "@/lib/api";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init.headers,
    },
  });
}

function textResponse(body: string, init: ResponseInit = {}) {
  return new Response(body, init);
}

function mockFetch(...responses: Response[]) {
  const fetchMock = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>();

  for (const response of responses) {
    fetchMock.mockResolvedValueOnce(response);
  }

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function requestInitAt(fetchMock: ReturnType<typeof mockFetch>, index: number) {
  return fetchMock.mock.calls[index][1] as RequestInit;
}

describe("api client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("builds API URLs from normalized paths", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.test/api/");

    expect(buildRawApiUrl("accounts")).toBe(
      "https://api.example.test/api/accounts",
    );
    expect(buildRawApiUrl("/accounts")).toBe(
      "https://api.example.test/api/accounts",
    );
  });

  it("sends credentialed JSON requests with content type when a body exists", async () => {
    const fetchMock = mockFetch(jsonResponse({ id: "account-1" }));

    await expect(api.post("/accounts", { name: "Cash" })).resolves.toEqual({
      id: "account-1",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/accounts",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        credentials: "include",
        body: JSON.stringify({ name: "Cash" }),
      }),
    );
    expect((requestInitAt(fetchMock, 0).headers as Headers).get("Content-Type")).toBe(
      "application/json",
    );
  });

  it("does not add content type when there is no request body", async () => {
    const fetchMock = mockFetch(jsonResponse([{ id: "account-1" }]));

    await expect(api.get("/accounts")).resolves.toEqual([{ id: "account-1" }]);

    expect(requestInitAt(fetchMock, 0).method).toBe("GET");
    expect((requestInitAt(fetchMock, 0).headers as Headers).has("Content-Type")).toBe(
      false,
    );
  });

  it("parses text and empty responses", async () => {
    mockFetch(textResponse("plain response"));
    await expect(api.get<string>("/plain")).resolves.toBe("plain response");

    mockFetch(new Response(null, { status: 204 }));
    await expect(api.delete<void>("/accounts/account-1")).resolves.toBeUndefined();
  });

  it("throws ApiError using backend error fields", async () => {
    mockFetch(jsonResponse({ error: "Invalid credentials" }, { status: 401 }));

    await expect(api.post("/auth/login", {})).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      message: "Invalid credentials",
    } satisfies Partial<ApiError>);
  });

  it("throws ApiError using backend message fields", async () => {
    mockFetch(jsonResponse({ message: "Budget exists" }, { status: 409 }));

    await expect(api.post("/budgets", {})).rejects.toMatchObject({
      status: 409,
      message: "Budget exists",
    });
  });

  it("throws ApiError using text fallback", async () => {
    mockFetch(textResponse("Service unavailable", { status: 503 }));

    await expect(api.get("/accounts")).rejects.toMatchObject({
      status: 503,
      message: "Service unavailable",
    });
  });

  it("refreshes once and retries protected requests after a 401", async () => {
    const fetchMock = mockFetch(
      jsonResponse({ error: "Authentication required" }, { status: 401 }),
      jsonResponse({ user: { id: "user-1" } }),
      jsonResponse([{ id: "account-1" }]),
    );

    await expect(api.get("/accounts")).resolves.toEqual([{ id: "account-1" }]);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8000/api/accounts");
    expect(fetchMock.mock.calls[1][0]).toBe("http://localhost:8000/api/auth/refresh");
    expect(fetchMock.mock.calls[2][0]).toBe("http://localhost:8000/api/accounts");
    expect(requestInitAt(fetchMock, 1)).toMatchObject({
      method: "POST",
      cache: "no-store",
      credentials: "include",
    });
  });

  it("does not refresh public auth endpoint failures", async () => {
    const fetchMock = mockFetch(
      jsonResponse({ error: "Invalid credentials" }, { status: 401 }),
    );

    await expect(api.post("/auth/login", {})).rejects.toMatchObject({
      status: 401,
      message: "Invalid credentials",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry a protected request more than once", async () => {
    const fetchMock = mockFetch(
      jsonResponse({ error: "Authentication required" }, { status: 401 }),
      jsonResponse({ user: { id: "user-1" } }),
      jsonResponse({ error: "Still unauthorized" }, { status: 401 }),
    );

    await expect(api.get("/accounts")).rejects.toMatchObject({
      status: 401,
      message: "Still unauthorized",
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
