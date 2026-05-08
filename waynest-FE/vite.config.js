import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    base: env.VITE_BASE_PATH || "/",
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(dirname, "src"),
        antd: path.resolve(dirname, "node_modules/antd/es/index.js"),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:3001",
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: "dist",
      chunkSizeWarningLimit: 2000,
    },
  };
});
