import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      antd: path.resolve(__dirname, "node_modules/antd/es/index.js"),
    },
  },
  optimizeDeps: {
    include: ["antd"],
  },
  plugins: [react()],
});
