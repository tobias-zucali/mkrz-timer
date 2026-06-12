import os from "node:os"
import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

import { buildRemoteRewrites } from "./src/routing/remotePaths.ts"

const distDir = process.env.NEXT_DIST_DIR
const isStaticExport = process.env.NODE_ENV === "production"

function getLocalIPv4Addresses() {
  return Object.values(os.networkInterfaces()).flatMap((networks) =>
    (networks ?? [])
      .filter((network) => network.family === "IPv4" && !network.internal)
      .map((network) => network.address),
  )
}

const nextConfig: NextConfig = {
  ...(distDir ? { distDir } : {}),
  ...(isStaticExport ? { output: "export" as const } : {}),
  ...(!isStaticExport
    ? {
        async rewrites() {
          return buildRemoteRewrites()
        },
      }
    : {}),
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.mp3": {
        loaders: ["file-loader"],
        as: "*.mp3",
      },
    },
  },
  allowedDevOrigins: ["localhost", "127.0.0.1", ...getLocalIPv4Addresses()],
}

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

export default withNextIntl(nextConfig)
