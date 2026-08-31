import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

const rawPort = process.env.PORT || "18650";
const port = Number(rawPort);
const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        // Excel and charting are a third of the payload and are only reached
        // from reporting screens. Field staff recording sessions never open
        // them, so they are fetched on first use instead of being pushed to
        // every phone up front -- and cached once fetched, so a supervisor who
        // has opened reports once still has them offline.
        globIgnores: ["**/vendor-xlsx-*.js", "**/vendor-charts-*.js"],
        runtimeCaching: [{
          urlPattern: /\/assets\/vendor-(xlsx|charts)-.*\.js$/,
          handler: "CacheFirst",
          options: { cacheName: "heavy-vendor", expiration: { maxEntries: 8 } },
        }],
        cleanupOutdatedCaches: true,
        // A SPA route has no file of its own, so without a fallback every
        // deep link failed offline even though the whole app was cached.
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        name: "قاعدة بيانات التأهيل",
        short_name: "التأهيل",
        description: "نظام إدارة حالات التأهيل الميداني في غزة",
        theme_color: "#1d4ed8",
        background_color: "#f8fafc",
        display: "standalone",
        orientation: "any",
        lang: "ar",
        dir: "rtl",
        categories: ["medical", "productivity"],
        icons: [
          {
            src: "pwa-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "pwa-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          "vendor-react": ["react", "react-dom"],
          // Routing
          "vendor-router": ["wouter"],
          // UI components
          "vendor-ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-checkbox",
            "@radix-ui/react-switch",
            "@radix-ui/react-label",
            "@radix-ui/react-toast",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-dropdown-menu",
          ],
          // Charts
          "vendor-charts": ["recharts"],
          // Excel export
          "vendor-xlsx": ["xlsx"],
          // Database
          "vendor-db": ["dexie"],
          // Supabase
          "vendor-supabase": ["@supabase/supabase-js"],
          // Icons
          "vendor-icons": ["lucide-react"],
        },
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});