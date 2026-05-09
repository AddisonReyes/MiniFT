import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import Script from "next/script";

import { Providers } from "@/components/providers";
import "@/app/globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  title: "MiniFT",
  description:
    "Minimal personal finance tracking with accounts, budgets, transfers, and recurring transactions.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#090C11",
  viewportFit: "cover",
};

const nativeAppRootRedirectScript = `
  (function () {
    var isNativeAppEntry =
      window.location.protocol === "http:" &&
      window.location.hostname === "localhost" &&
      window.location.port === "" &&
      window.location.pathname === "/";

    if (isNativeAppEntry) {
      window.location.replace("/login");
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} font-sans antialiased`}
      >
        <Script id="native-app-root-redirect" strategy="beforeInteractive">
          {nativeAppRootRedirectScript}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
