import os from "node:os"
import type { NextConfig } from "next"

function getLocalIPv4Addresses() {
  return Object.values(os.networkInterfaces()).flatMap((networks) =>
    (networks ?? [])
      .filter((network) => network.family === "IPv4" && !network.internal)
      .map((network) => network.address),
  )
}

const nextConfig: NextConfig = {
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

export default nextConfig
