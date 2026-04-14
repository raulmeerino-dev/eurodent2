import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const devProxyTarget = process.env.VITE_DEV_PROXY_TARGET || "http://localhost:8010";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("@tanstack")) {
              return "vendor-query";
            }
            if (id.includes("date-fns")) {
              return "vendor-date";
            }
            return "vendor";
          }
        },
      },
    },
  },
  server: {
    port: 5183,
    host: true,
    proxy: {
      "/api": {
        target: devProxyTarget,
        changeOrigin: true,
      },
    },
  },
});
