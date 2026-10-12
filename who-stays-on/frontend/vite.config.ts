import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Built files go to ../static, which FastAPI serves: index.html at "/", assets under "/static".
// The backend CSP allows only same-origin scripts/styles, so no inline module-preload polyfill.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/static/",
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  server: {
    port: 5173,
    proxy: { "/api": { target: "http://127.0.0.1:8000", changeOrigin: false } },
  },
  build: {
    outDir: "../static",
    emptyOutDir: true,
    modulePreload: { polyfill: false },
    assetsInlineLimit: 0, // CSP: font-src/img via default-src 'self', so no data: fonts
    chunkSizeWarningLimit: 900,
  },
});
