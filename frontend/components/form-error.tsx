"use client";

import { ApiError } from "@/lib/api";

export function FormError({
  error,
  fallbackMessage,
}: {
  error: unknown;
  fallbackMessage: string;
}) {
  if (!error) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-hazard/20 bg-hazard/10 px-4 py-3 text-sm text-hazard">
      {error instanceof ApiError ? error.message : fallbackMessage}
    </div>
  );
}
