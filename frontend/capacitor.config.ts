import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.minift.net",
  appName: "MiniFT",
  webDir: "out",
  server: {
    hostname: "localhost",
    androidScheme: "http",
  },
};

export default config;
