import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = env.VITE_BASE_PATH || "/";

  return {
    base,
    resolve: {
      alias: {
        antd: path.resolve(__dirname, "node_modules/antd/es/index.js"),
      },
    },
    optimizeDeps: {
      include: ["antd"],
    },
    plugins: [react()],
    build: {
      outDir: "dist",
      chunkSizeWarningLimit: 750,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (id.includes("antd")) return "antd";
            if (id.includes("react-router")) return "router";
            if (id.includes("react")) return "react-vendor";
            return "vendor";
          },
        },
      },
    },
  };
});
