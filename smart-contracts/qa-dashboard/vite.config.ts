import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = (env.VITE_RPC_PROXY_TARGET || "").trim().replace(/\/$/, "");

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      host: true,
      strictPort: true,
      // Browser → /rpc → BSC (avoids CORS on public RPC URLs)
      proxy: proxyTarget
        ? {
            "/rpc": {
              target: proxyTarget,
              changeOrigin: true,
              secure: true,
              rewrite: () => "/",
            },
          }
        : undefined,
    },
  };
});
