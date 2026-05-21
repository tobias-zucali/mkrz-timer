import assert from "node:assert/strict"
import { test } from "node:test"

import {
  getRemoteRelayHealthcheckUrl,
  getRemoteRelayWebSocketUrl,
} from "./config.ts"

const originalWindow = globalThis.window
const originalRemoteUrl = process.env.NEXT_PUBLIC_REMOTE_WS_URL

const setMockWindow = (hostname: string, protocol = "http:") => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: {
        host: `${hostname}:3000`,
        hostname,
        protocol,
      },
    },
  })
}

test.afterEach(() => {
  process.env.NEXT_PUBLIC_REMOTE_WS_URL = originalRemoteUrl

  if (originalWindow === undefined) {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: undefined,
    })
    return
  }

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: originalWindow,
  })
})

test("getRemoteRelayHealthcheckUrl returns the configured health endpoint", () => {
  process.env.NEXT_PUBLIC_REMOTE_WS_URL = "ws://127.0.0.1:9100/ws"

  assert.equal(getRemoteRelayHealthcheckUrl(), "http://127.0.0.1:9100/health")
})

test("getRemoteRelayHealthcheckUrl rewrites loopback relay hosts to the page hostname", () => {
  process.env.NEXT_PUBLIC_REMOTE_WS_URL = "ws://0.0.0.0:9100/ws"
  setMockWindow("192.168.1.33")

  assert.equal(
    getRemoteRelayHealthcheckUrl(),
    "http://192.168.1.33:9100/health",
  )
})

test("getRemoteRelayWebSocketUrl rewrites loopback relay hosts to the page hostname", () => {
  process.env.NEXT_PUBLIC_REMOTE_WS_URL = "ws://127.0.0.1:9100/ws"
  setMockWindow("192.168.1.33")

  assert.equal(getRemoteRelayWebSocketUrl(), "ws://192.168.1.33:9100/ws")
})

test("getRemoteRelayWebSocketUrl keeps non-loopback relay hosts unchanged", () => {
  process.env.NEXT_PUBLIC_REMOTE_WS_URL = "wss://ws.timer.mkrz.at/ws"
  setMockWindow("192.168.1.33", "https:")

  assert.equal(getRemoteRelayWebSocketUrl(), "wss://ws.timer.mkrz.at/ws")
})
