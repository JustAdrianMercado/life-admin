import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // App personal 100% dinámica: cada página lee la base de datos y la sesión.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Que el navegador siempre revise si hay una versión nueva del service worker.
  async headers() {
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] }];
  },
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
