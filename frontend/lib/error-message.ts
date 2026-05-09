"use client";

import { ApiError } from "@/lib/api";
import { isNativeAppShell } from "@/lib/platform";

const androidBackendHint =
  "Cannot reach the backend. If you are using a local API, start it and run npm run android:reverse. If you are using a deployed API, allow http://localhost and https://localhost in CORS_ALLOWED_ORIGINS.";

const genericBackendHint =
  "Cannot reach the backend. Check that the API is running and reachable from this app.";

function isNetworkLikeError(error: Error) {
  return (
    error.name === "TypeError" &&
    ["Failed to fetch", "Network request failed"].includes(error.message)
  );
}

export function describeError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    if (isNetworkLikeError(error)) {
      return isNativeAppShell() ? androidBackendHint : genericBackendHint;
    }

    return error.message || fallbackMessage;
  }

  return fallbackMessage;
}
