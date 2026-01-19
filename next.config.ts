import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.mp3": {
        loaders: ["file-loader"],
        as: "*.mp3",
      },
    },
  },
}

export default nextConfig
