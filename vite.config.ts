import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  plugins: [sveltekit()],
  resolve: {
    alias: {
      "@app": path.resolve("./src"),
      "@errors": path.resolve("./src/errors"),
      "@events": path.resolve("./src/events"),
      "@factories": path.resolve("./src/factories"),
      "@services": path.resolve("./src/services"),
      "@types": path.resolve("./src/types"),
      "@utils": path.resolve("./src/utils"),
      "@lib": path.resolve("./src/lib"),
      "@tests": path.resolve("./src/tests"),
      $lib: path.resolve("./src/lib"),
      $tests: path.resolve("./src/tests"),
      $env: path.resolve("./src/env"),
    },
  },
  test: {
    include: ["src/**/*.{test,spec}.{js,ts}"],
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/tests/setup.ts"],
  },
});
