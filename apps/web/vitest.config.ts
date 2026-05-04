import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@repo/player-leveling": fileURLToPath(
        new URL(
          "../../packages/player-leveling/src/index.ts",
          import.meta.url,
        ),
      ),
    },
  },
  css: {
    modules: {
      generateScopedName: "[local]",
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./test/setup.tsx"],
    include: ["app/**/*.test.{ts,tsx}", "features/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["app/**/*.{ts,tsx}", "features/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/*.d.ts",
        "**/*.module.css",
        "app/layout.tsx",
        "app/game/layout.tsx",
        "app/leaderboard/layout.tsx",
        "app/login/page.tsx",
        "app/signup/page.tsx",
        "app/game/page.tsx",
        "app/game/flags-database.json",
        "firebaseConfig.ts",
      ],
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90,
      },
    },
  },
});
