import { defineConfig } from "vite";
import { resolve } from "path";
import minifyLiterals from "rollup-plugin-minify-template-literals";

export default defineConfig(({ mode }) => ({
  root: mode === "development" ? "dev" : undefined,
  // minify the CSS/HTML *inside* lit tagged template literals — esbuild
  // can't touch string contents, so this runs as a separate build step
  plugins: mode === "production" ? [minifyLiterals()] : [],
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
      entry: resolve(__dirname, "src/index.ts"),
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
