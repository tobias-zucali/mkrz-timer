import type { MetadataRoute } from "next"

import {
  PWA_APP_NAME,
  PWA_DESCRIPTION,
  PWA_ICON_SPECS,
  PWA_SHORT_NAME,
  PWA_THEME_COLOR,
} from "@/app/pwa"

export const dynamic = "force-static"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: PWA_APP_NAME,
    short_name: PWA_SHORT_NAME,
    description: PWA_DESCRIPTION,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: PWA_THEME_COLOR,
    theme_color: PWA_THEME_COLOR,
    icons: [...PWA_ICON_SPECS],
  }
}
