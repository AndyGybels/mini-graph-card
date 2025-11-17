import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig(({ mode }) => ({
  root: mode === "development" ? "dev" : undefined,
  resolve: {
    alias: {
      "~": resolve(__dirname, "./src"),
      "/src": resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3300,
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/main.ts"),
      name: "MiniGraphCard",
      formats: ["iife"],
      fileName: () => "mini-graph-card-bundle.js",
    },
    outDir: "dist",
    emptyOutDir: false,
    minify: mode === "production",
    sourcemap: mode === "development" ? "inline" : false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        compact: mode === "production",
      },
    },
  },
  esbuild: {
    minifyIdentifiers: mode === "production",
    minifySyntax: mode === "production",
    minifyWhitespace: mode === "production",
  },
}));
