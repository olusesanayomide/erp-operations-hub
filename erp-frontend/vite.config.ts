import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/scheduler/")
          ) {
            return "vendor-react";
          }

          if (
            id.includes("node_modules/@tanstack/react-query") ||
            id.includes("node_modules/@tanstack/query-core")
          ) {
            return "vendor-query";
          }

          if (id.includes("node_modules/@supabase/")) {
            return "vendor-supabase";
          }

          if (id.includes("node_modules/@radix-ui/")) {
            return "vendor-radix";
          }

          if (id.includes("node_modules/recharts")) {
            return "vendor-charts";
          }

          if (id.includes("node_modules/framer-motion")) {
            return "vendor-motion";
          }

          if (id.includes("node_modules/lucide-react")) {
            return "vendor-icons";
          }

          return "vendor";
        },
      },
    },
  },
}));
