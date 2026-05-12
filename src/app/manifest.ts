import type { MetadataRoute } from "next"

export const dynamic = "force-static"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "mkrz timer",
    short_name: "timer",
    description: "simple time keeping",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#dddddd",
    theme_color: "#dddddd",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  }
}
