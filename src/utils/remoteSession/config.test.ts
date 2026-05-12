import assert from "node:assert/strict"
import { test } from "node:test"

import { getRemoteRelayHealthcheckUrl } from "./config.ts"

test("getRemoteRelayHealthcheckUrl returns the configured health endpoint", () => {
  process.env.NEXT_PUBLIC_REMOTE_WS_URL = "ws://127.0.0.1:9100/ws"

  assert.equal(getRemoteRelayHealthcheckUrl(), "http://127.0.0.1:9100/health")
})
