import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  // base: "/rtc",
  build: { outDir: "./dist" },
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: ["api.rtcas.in.th", "rtcas.in.th", "www.rtcas.in.th"],
    proxy: {
      "/api": {
        target: "http://localhost:3000/api/",
        // target: "https://api.pargorn.com/api/",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, "")
      },
    },
  },
});
