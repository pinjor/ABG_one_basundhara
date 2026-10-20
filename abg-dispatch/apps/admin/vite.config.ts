import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 18490,
    strictPort: true,
    proxy: {
      "/api": { target: process.env.VITE_API_PROXY_TARGET ?? "http://localhost:18491", changeOrigin: true },
    },
  },
  preview: { port: 18490 },
  // Never inline assets as data: URIs, so the Content-Security-Policy can stay strict.
  build: { assetsInlineLimit: 0 },
});
