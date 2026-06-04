"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { useSessionQuery } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { describeError } from "@/lib/error-message";

export function PageFrame({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const session = useSessionQuery();

  useEffect(() => {
    if (session.error instanceof ApiError && session.error.status === 401) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [pathname, router, session.error]);

  if (session.isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <Card className="text-center text-mist">{t("pageFrame.loading")}</Card>
      </div>
    );
  }

  if (
    session.error &&
    !(session.error instanceof ApiError && session.error.status === 401)
  ) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <Card className="space-y-3">
          <h2 className="text-xl font-semibold">{t("pageFrame.errorTitle")}</h2>
          <p>{describeError(session.error, t("pageFrame.errorTitle"))}</p>
        </Card>
      </div>
    );
  }

  if (!session.data) {
    return null;
  }

  return (
    <AppShell title={title} description={description} actions={actions}>
      {children}
    </AppShell>
  );
}
