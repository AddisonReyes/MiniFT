"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { isNativeAppShell } from "@/lib/platform";

export function NativeAppLandingGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const shouldRedirectToLogin = isNativeAppShell();

  useEffect(() => {
    if (shouldRedirectToLogin) {
      router.replace("/login");
    }
  }, [router, shouldRedirectToLogin]);

  if (shouldRedirectToLogin) {
    return <main className="min-h-dvh bg-ink" aria-hidden="true" />;
  }

  return <>{children}</>;
}
