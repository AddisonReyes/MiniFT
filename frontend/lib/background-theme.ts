export const BACKGROUND_THEME_STORAGE_KEY = "minift_background_theme";
export const BACKGROUND_THEME_CHANGE_EVENT = "minift-background-theme-change";

export const BACKGROUND_THEMES = ["structured", "flow", "minimal"] as const;

export type BackgroundThemeId = (typeof BACKGROUND_THEMES)[number];

export const DEFAULT_BACKGROUND_THEME: BackgroundThemeId = "structured";

const LEGACY_BACKGROUND_THEMES: Record<string, BackgroundThemeId> = {
  ledger: "structured",
  cashflow: "flow",
  glass: "minimal",
};

export function normalizeBackgroundTheme(
  value: string | null | undefined,
): BackgroundThemeId | null {
  if (!value) {
    return null;
  }

  return BACKGROUND_THEMES.includes(value as BackgroundThemeId)
    ? (value as BackgroundThemeId)
    : LEGACY_BACKGROUND_THEMES[value]
      ? LEGACY_BACKGROUND_THEMES[value]
    : null;
}

export function getStoredBackgroundTheme(): BackgroundThemeId {
  if (typeof window === "undefined") {
    return DEFAULT_BACKGROUND_THEME;
  }

  const storedValue = window.localStorage.getItem(BACKGROUND_THEME_STORAGE_KEY);
  const normalizedTheme = normalizeBackgroundTheme(storedValue);

  if (normalizedTheme && storedValue !== normalizedTheme) {
    window.localStorage.setItem(BACKGROUND_THEME_STORAGE_KEY, normalizedTheme);
  }

  return normalizedTheme ?? DEFAULT_BACKGROUND_THEME;
}

export function hasStoredBackgroundTheme() {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(
    normalizeBackgroundTheme(
      window.localStorage.getItem(BACKGROUND_THEME_STORAGE_KEY),
    ),
  );
}

export function getRandomBackgroundTheme(): BackgroundThemeId {
  const index = Math.floor(Math.random() * BACKGROUND_THEMES.length);

  return BACKGROUND_THEMES[index] ?? DEFAULT_BACKGROUND_THEME;
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
