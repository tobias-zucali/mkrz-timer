import assert from "node:assert/strict"
import { test } from "vitest"

import { shouldDisplayRemoteError } from "./remoteErrorVisibility.ts"

test("suppresses handled remote errors while reconnecting or offline", () => {
  assert.equal(shouldDisplayRemoteError("liveReconnecting"), false)
  assert.equal(shouldDisplayRemoteError("liveOffline"), false)
})

test("keeps remote errors visible for conflict and startup states", () => {
  assert.equal(shouldDisplayRemoteError("liveConflict"), true)
  assert.equal(shouldDisplayRemoteError("liveConnecting"), true)
  assert.equal(shouldDisplayRemoteError("liveConnected"), true)
  assert.equal(shouldDisplayRemoteError("local"), true)
})
