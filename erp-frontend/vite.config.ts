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
            return undefined;
          }

          if (id.includes("recharts")) {
            return "charts";
          }

          if (id.includes("@radix-ui") || id.includes("cmdk") || id.includes("vaul")) {
            return "ui-vendor";
          }

          if (id.includes("framer-motion")) {
            return "motion";
          }

          if (id.includes("@supabase")) {
            return "supabase";
          }

          if (
            id.includes("react-router") ||
            id.includes("@tanstack/react-query") ||
            id.includes("@tanstack/query-core")
          ) {
            return "app-core";
          }

          if (id.includes("react") || id.includes("scheduler")) {
            return "react-vendor";
          }

          if (id.includes("lucide-react")) {
            return "icons";
          }

          return "vendor";
        },
      },
    },
  },
}));
