import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    base: env.VITE_BASE_PATH || "/",
    plugins: [
      react(),
      VitePWA({
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.js",
        registerType: "autoUpdate",
        manifest: {
          name: "Waynest",
          short_name: "Waynest",
          description: "Travel planning and social platform",
          theme_color: "#FAF7F2",
          background_color: "#FAF7F2",
          display: "standalone",
          start_url: "/",
          icons: [
            {
              src: "/images/waynest-icon.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "any maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,jpg,ico,woff2}"],
        },
      }),
    ],

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
      cssCodeSplit: false,
      chunkSizeWarningLimit: 2000,
    },
  };
});
