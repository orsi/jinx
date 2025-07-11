import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  esbuild: {
    jsx: "transform",
    jsxFactory: "__jsx",
    jsxFragment: "__Fragment",
    jsxInject: "import { jsx as __jsx, Fragment as __Fragment } from 'jinx';",
  },
  resolve: {
    alias: {
      "jinx": path.resolve(__dirname, "../packages/jinx"),
    },
  },
});
