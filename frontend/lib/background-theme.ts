export const BACKGROUND_THEME_STORAGE_KEY = "minift_background_theme";
export const BACKGROUND_THEME_CHANGE_EVENT = "minift-background-theme-change";

export const BACKGROUND_THEMES = ["ledger", "cashflow", "glass"] as const;

export type BackgroundThemeId = (typeof BACKGROUND_THEMES)[number];

export const DEFAULT_BACKGROUND_THEME: BackgroundThemeId = "ledger";

export function normalizeBackgroundTheme(
  value: string | null | undefined,
): BackgroundThemeId | null {
  return BACKGROUND_THEMES.includes(value as BackgroundThemeId)
    ? (value as BackgroundThemeId)
    : null;
}

export function getStoredBackgroundTheme(): BackgroundThemeId {
  if (typeof window === "undefined") {
    return DEFAULT_BACKGROUND_THEME;
  }

  return (
    normalizeBackgroundTheme(
      window.localStorage.getItem(BACKGROUND_THEME_STORAGE_KEY),
    ) ?? DEFAULT_BACKGROUND_THEME
  );
}

export function applyBackgroundTheme(
  theme: BackgroundThemeId,
  { animate = false }: { animate?: boolean } = {},
) {
  if (typeof document === "undefined") {
    return;
  }

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (!animate || prefersReducedMotion) {
    document.body.dataset.backgroundTheme = theme;
    delete document.body.dataset.backgroundTransitioning;
    return;
  }

  document.body.dataset.backgroundTransitioning = "true";

  window.setTimeout(() => {
    document.body.dataset.backgroundTheme = theme;
  }, 80);

  window.setTimeout(() => {
    delete document.body.dataset.backgroundTransitioning;
  }, 360);
}

export function storeBackgroundTheme(theme: BackgroundThemeId) {
  window.localStorage.setItem(BACKGROUND_THEME_STORAGE_KEY, theme);
  window.dispatchEvent(new CustomEvent(BACKGROUND_THEME_CHANGE_EVENT));
}
