import { defineConfig } from "vite";

export default defineConfig({
  esbuild: {
    jsx: "transform",
    jsxFactory: "__jsx",
    jsxFragment: "__Fragment",
    jsxInject: "import { jsx as __jsx, Fragment as __Fragment } from './jsx-runtime';",
  },
});
