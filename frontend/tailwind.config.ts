import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b0d12",
        surface: "#121722",
        line: "#2a3144",
        mist: "#99a3ba",
        signal: "#7ae7b9",
        hazard: "#ff8b8b",
        amber: "#f7c267",
      },
      fontFamily: {
        sans: ["var(--font-space-grotesk)"],
        mono: ["var(--font-ibm-plex-mono)"],
      },
      boxShadow: {
        panel: "0 18px 50px rgba(0, 0, 0, 0.35)",
        soft: "0 12px 34px rgba(0, 0, 0, 0.24)",
      },
    },
  },
  plugins: [],
};

export default config;
