"use client";

import { Capacitor } from "@capacitor/core";

type LocationLike = Pick<Location, "hostname" | "pathname" | "port" | "protocol">;

export function isNativeAppShellUrl(location: LocationLike) {
  return (
    location.protocol === "http:" &&
    location.hostname === "localhost" &&
    location.port === ""
  );
}

export function isNativeAppShell() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    Capacitor.isNativePlatform() || isNativeAppShellUrl(window.location)
  );
}
