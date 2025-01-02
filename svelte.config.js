import adapter from "@sveltejs/adapter-auto";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import path from "path";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter(),
    alias: {
      $lib: path.resolve("./src/lib"),
      $tests: path.resolve("./src/tests"),
      $env: path.resolve("./src/env"),
    },
  },
  preprocess: vitePreprocess(),
};

export default config;
