import assert from "node:assert/strict"
import { test } from "node:test"

import { getPeerServerReachabilityUrl } from "../peerServerConfig/index.ts"

test("getPeerServerReachabilityUrl returns the configured health endpoint", () => {
  process.env.NEXT_PUBLIC_PEERJS_HOST = "127.0.0.1"
  process.env.NEXT_PUBLIC_PEERJS_PORT = "9100"
  process.env.NEXT_PUBLIC_PEERJS_PATH = "/"
  process.env.NEXT_PUBLIC_PEERJS_SECURE = "false"

  assert.equal(
    getPeerServerReachabilityUrl(),
    "http://127.0.0.1:9100/peerjs/id",
  )
})
