import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Admin · Panel personal",
    short_name: "Admin",
    description: "Gastos, cuentas, suscripciones, calendario, pendientes y hábitos.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f5f2",
    theme_color: "#4f46e5",
    lang: "es",
    // Al mantener presionado el ícono (Android y escritorio; iOS no los muestra).
    shortcuts: [
      { name: "Nuevo gasto", short_name: "Gasto", url: "/?nuevo=gasto", icons: [{ src: "/icon", sizes: "512x512" }] },
      { name: "Nuevo evento", short_name: "Evento", url: "/?nuevo=evento", icons: [{ src: "/icon", sizes: "512x512" }] },
      { name: "Nuevo pendiente", short_name: "Pendiente", url: "/?nuevo=pendiente", icons: [{ src: "/icon", sizes: "512x512" }] },
    ],
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
