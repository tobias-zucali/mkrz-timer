import type { NextConfig } from "next"

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
}

export default nextConfig
