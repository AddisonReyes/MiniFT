import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const ACCESS_COOKIE = "minift_access_token";
const REFRESH_COOKIE = "minift_refresh_token";
const ACCESS_MAX_AGE = 60 * 15;
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;
const BODY_METHODS = new Set(["POST", "PUT", "PATCH"]);

export const dynamic = "force-dynamic";

function backendBaseUrl() {
  return process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000";
}

function shouldAttachToken(path: string[]) {
  return !(
    path[0] === "auth" &&
    ["login", "register", "refresh"].includes(path[1] ?? "")
  );
}

function isTokenPayload(value: unknown): value is {
  access_token: string;
  refresh_token: string;
  user: unknown;
} {
  return (
    typeof value === "object" &&
    value !== null &&
    "access_token" in value &&
    "refresh_token" in value
  );
}

function applyAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
) {
  const secure = process.env.NODE_ENV === "production";

  response.cookies.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: ACCESS_MAX_AGE,
  });

  response.cookies.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: REFRESH_MAX_AGE,
  });
}

function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  response.cookies.set(REFRESH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

async function callBackend(
  request: NextRequest,
  path: string[],
  bodyText: string | undefined,
  accessToken?: string,
) {
  const target = new URL(`/api/${path.join("/")}`, backendBaseUrl());
  target.search = request.nextUrl.search;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const accept = request.headers.get("accept");

  if (contentType) {
    headers.set("content-type", contentType);
  }

  if (accept) {
    headers.set("accept", accept);
  }

  if (accessToken && shouldAttachToken(path)) {
    headers.set("authorization", `Bearer ${accessToken}`);
  }

  return fetch(target, {
    method: request.method,
    headers,
    body: bodyText,
    cache: "no-store",
  });
}

async function refreshTokens(refreshToken: string) {
  const response = await fetch(new URL("/api/auth/refresh", backendBaseUrl()), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as {
    access_token: string;
    refresh_token: string;
    user: unknown;
  };
}

async function toClientResponse(source: Response) {
  const contentType = source.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = await source.json();

    if (isTokenPayload(payload)) {
      const { access_token, refresh_token, ...rest } = payload;
      const response = NextResponse.json(rest, { status: source.status });
      applyAuthCookies(response, access_token, refresh_token);
      return response;
    }

    return NextResponse.json(payload, { status: source.status });
  }

  return new NextResponse(await source.text(), {
    status: source.status,
    headers: contentType ? { "content-type": contentType } : undefined,
  });
}

async function proxy(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const path = (await params).path;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  let bodyText = BODY_METHODS.has(request.method)
    ? await request.text()
    : undefined;

  if (
    path[0] === "auth" &&
    path[1] === "refresh" &&
    !bodyText &&
    refreshToken
  ) {
    bodyText = JSON.stringify({ refresh_token: refreshToken });
  }

  const initialResponse = await callBackend(
    request,
    path,
    bodyText,
    accessToken,
  );

  if (initialResponse.status !== 401 || !refreshToken || path[0] === "auth") {
    return toClientResponse(initialResponse);
  }

  const refreshed = await refreshTokens(refreshToken);

  if (!refreshed) {
    const response = await toClientResponse(initialResponse);
    clearAuthCookies(response);
    return response;
  }

  const retriedResponse = await callBackend(
    request,
    path,
    bodyText,
    refreshed.access_token,
  );
  const response = await toClientResponse(retriedResponse);
  applyAuthCookies(response, refreshed.access_token, refreshed.refresh_token);
  return response;
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
