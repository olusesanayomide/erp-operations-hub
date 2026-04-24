import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

function parseList(value?: string) {
  return value
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean) ?? [];
}

function parsePort(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const port = parsePort(env.VITE_DEV_PORT, 8080);
  const allowAllHosts = env.VITE_ALLOW_ALL_HOSTS === "true";
  const allowedHosts = parseList(env.VITE_ALLOWED_HOSTS);
  const hmrHost = env.VITE_HMR_HOST?.trim();
  const hmrProtocol = env.VITE_HMR_PROTOCOL?.trim() || "wss";
  const hmrClientPort = parsePort(env.VITE_HMR_CLIENT_PORT, 443);
  const apiProxyPrefix = env.VITE_API_PROXY_PREFIX?.trim() || "/api-proxy";
  const apiProxyTarget = env.VITE_API_PROXY_TARGET?.trim() || "http://127.0.0.1:3000";

  return {
    server: {
      host: env.VITE_DEV_HOST?.trim() || "::",
      port,
      strictPort: true,
      allowedHosts: allowAllHosts ? true : allowedHosts,
      proxy: {
        [apiProxyPrefix]: {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (requestPath) =>
            requestPath.startsWith(apiProxyPrefix)
              ? requestPath.slice(apiProxyPrefix.length) || "/"
              : requestPath,
        },
      },
      hmr: {
        overlay: false,
        ...(hmrHost
          ? {
              host: hmrHost,
              protocol: hmrProtocol,
              clientPort: hmrClientPort,
            }
          : {}),
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
  };
});
