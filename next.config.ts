import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
    rules: {
      "*.mp3": {
        loaders: ["file-loader"],
        as: "*.mp3",
      },
    },
  },
}

export default nextConfig
