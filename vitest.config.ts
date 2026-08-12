import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // Pinned so date logic behaves identically here and in CI. Tests that care
    // about a zone name it explicitly rather than inheriting the machine's.
    env: { TZ: "UTC" },
    include: ["src/**/*.test.ts"],
  },
});
