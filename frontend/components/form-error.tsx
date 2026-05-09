"use client";

import { describeError } from "@/lib/error-message";

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
      {describeError(error, fallbackMessage)}
    </div>
  );
}
