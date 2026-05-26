"use client";

import { ApiError } from "@/lib/api";
import { isNativeAppShell } from "@/lib/platform";
import i18n from "@/lib/i18n/config";

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
      return isNativeAppShell()
        ? i18n.t("common.backendErrorAndroid")
        : i18n.t("common.backendError");
    }

    return error.message || fallbackMessage;
  }

  return fallbackMessage;
}
