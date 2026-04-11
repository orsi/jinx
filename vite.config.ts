import path from "path";
import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  define: {
    // __DEBUG__: true,
  },
  esbuild: {
    jsx: "transform",
    jsxFactory: "__jsx",
    jsxFragment: "__Fragment",
    jsxInject: "import { jsx as __jsx, Fragment as __Fragment } from 'jinx';",
  },
  resolve: {
    alias: {
      jinx: path.resolve(__dirname, "./packages/core"),
    },
  },
  test: {
    cache: false, // cacheing annoyingly doesn't update browser tests
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
    },
    testTimeout: 0,
  },
});
