import { defineConfig } from "vite";

export default defineConfig({
  esbuild: {
    // jsxFactory: 'h',
    // jsxFragment: 'Fragment',
    jsxInject: `import { jsx, Fragment } from './jsx-runtime';`,
  },
});
