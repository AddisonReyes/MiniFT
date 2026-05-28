"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";

import {
  applyBackgroundTheme,
  BACKGROUND_THEME_CHANGE_EVENT,
  getStoredBackgroundTheme,
} from "@/lib/background-theme";
import i18n from "@/lib/i18n/config";

const LOCALE_STORAGE_KEY = "minift_locale";
const SUPPORTED_LOCALES = new Set(["en", "es"]);

function normalizeLocale(value: string | null | undefined) {
  const locale = value?.slice(0, 2).toLowerCase();

  return locale && SUPPORTED_LOCALES.has(locale) ? locale : null;
}

function HtmlLangSync() {
  const { i18n: i18nInstance } = useTranslation();

  useEffect(() => {
    const lang = i18nInstance.language?.slice(0, 2) ?? "en";
    document.documentElement.lang = lang;
  }, [i18nInstance.language]);

  return null;
}

function BackgroundThemeSync() {
  useEffect(() => {
    applyBackgroundTheme(getStoredBackgroundTheme());

    function handleThemeChange() {
      applyBackgroundTheme(getStoredBackgroundTheme(), { animate: true });
    }

    window.addEventListener(BACKGROUND_THEME_CHANGE_EVENT, handleThemeChange);

    return () => {
      window.removeEventListener(
        BACKGROUND_THEME_CHANGE_EVENT,
        handleThemeChange,
      );
    };
  }, []);

  return null;
}

function ClientBootEffects({ onLocaleReady }: { onLocaleReady: () => void }) {
  useEffect(() => {
    const savedLocale = normalizeLocale(
      window.localStorage.getItem(LOCALE_STORAGE_KEY),
    );
    const browserLocale = normalizeLocale(window.navigator.language);
    const nextLocale = savedLocale ?? browserLocale;

    if (nextLocale && i18n.language.slice(0, 2) !== nextLocale) {
      void i18n.changeLanguage(nextLocale);
    }

    onLocaleReady();
  }, [onLocaleReady]);

  useEffect(() => {
    const isNativeAppEntry =
      window.location.protocol === "http:" &&
      window.location.hostname === "localhost" &&
      window.location.port === "" &&
      window.location.pathname === "/";

    if (isNativeAppEntry) {
      window.location.replace("/login");
    }
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [isLocaleReady, setIsLocaleReady] = useState(false);
  const handleLocaleReady = useCallback(() => setIsLocaleReady(true), []);
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
      <ClientBootEffects onLocaleReady={handleLocaleReady} />
      <HtmlLangSync />
      <BackgroundThemeSync />
      <QueryClientProvider client={queryClient}>
        {isLocaleReady ? children : <main className="min-h-screen bg-ink" />}
      </QueryClientProvider>
    </I18nextProvider>
  );
}
