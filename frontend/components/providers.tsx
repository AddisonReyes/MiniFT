"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";

import i18n from "@/lib/i18n/config";

function HtmlLangSync() {
  const { i18n: i18nInstance } = useTranslation();

  useEffect(() => {
    const lang = i18nInstance.language?.slice(0, 2) ?? "en";
    document.documentElement.lang = lang;
  }, [i18nInstance.language]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            gcTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <I18nextProvider i18n={i18n}>
      <HtmlLangSync />
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </I18nextProvider>
  );
}
