import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Admin · Panel personal",
    short_name: "Admin",
    description: "Suscripciones, pendientes, gastos y metas de ahorro.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f5f2",
    theme_color: "#4f46e5",
    lang: "es",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
