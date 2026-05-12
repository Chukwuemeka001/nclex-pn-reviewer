import { defineConfig } from "vite";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  server: {
    proxy: {
      "/api/review": {
        target: "http://127.0.0.1:5174",
        changeOrigin: true,
      },
    },
  },
});
