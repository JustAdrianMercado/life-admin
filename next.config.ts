import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // App personal 100% dinámica: cada página lee la base de datos y la sesión.
  serverExternalPackages: ["@electric-sql/pglite"],
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
