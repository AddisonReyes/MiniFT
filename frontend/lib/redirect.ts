const INTERNAL_REDIRECT_ORIGIN = "https://minift.local";

export function sanitizeRedirectTarget(
  value: string | null | undefined,
  fallback = "/dashboard",
) {
  if (!value) {
    return fallback;
  }

  try {
    const url = new URL(value, INTERNAL_REDIRECT_ORIGIN);

    if (url.origin !== INTERNAL_REDIRECT_ORIGIN) {
      return fallback;
    }

    if (!url.pathname.startsWith("/") || url.pathname.startsWith("//")) {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
