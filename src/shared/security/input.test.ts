import assert from "node:assert/strict"
import test from "node:test"

import {
  DEFAULT_SYNC_PARAMS,
  MAX_CLIENT_MESSAGE_BYTES,
  MAX_TITLE_LENGTH,
  normalizeQueryParams,
  normalizeRelayClientMessage,
  normalizeRelayServerMessage,
  normalizeSessionSnapshot,
  normalizeSyncParamPatch,
  normalizeTitle,
  normalizeTimerState,
} from "./input.ts"

test("normalizeTitle treats user input as plain text and trims unsafe control characters", () => {
  const maliciousTitle =
    '  <img src=x onerror="window.__xss = 1">\u0000<script>alert(1)</script>  '

  assert.equal(
    normalizeTitle(maliciousTitle),
    '<img src=x onerror="window.__xss = 1"> <script>alert(1)</script>',
  )
})

test("normalizeTitle enforces a maximum length", () => {
  assert.equal(
    normalizeTitle("x".repeat(MAX_TITLE_LENGTH + 20)).length,
    MAX_TITLE_LENGTH,
  )
})

test("normalizeQueryParams falls back safely for malformed values", () => {
  assert.deepEqual(
    normalizeQueryParams({
      bg: "javascript:alert(1)",
      control: "1",
      fg: "#ABCDEF",
      m: "9999",
      pc: "ff00gg",
      rid: '<svg onload="alert(1)">',
      s: "-5",
      title: "  Hello<script>  ",
      unexpected: "ignored",
    }),
    {
      ...DEFAULT_SYNC_PARAMS,
      control: null,
      fg: "#abcdef",
      pid: "",
      rid: "",
      title: "Hello<script>",
    },
  )
})

test("normalizeSyncParamPatch only returns supported sanitized fields", () => {
  assert.deepEqual(
    normalizeSyncParamPatch({
      bg: "ff00aa",
      title: '  <b onclick="boom()">Title</b>  ',
      unknown: "ignored",
    }),
    {
      bg: "#ff00aa",
      title: '<b onclick="boom()">Title</b>',
    },
  )
})

test("normalizeTimerState rejects invalid numbers and keeps safe defaults", () => {
  assert.deepEqual(
    normalizeTimerState({
      elapsedTime: Number.POSITIVE_INFINITY,
      isPaused: "false",
      isStarted: true,
      revision: -1,
      totalDuration: -10,
    }),
    {
      elapsedTime: 0,
      isPaused: true,
      isStarted: true,
      revision: 0,
      totalDuration: 60,
    },
  )
})

test("normalizeSessionSnapshot sanitizes nested params and state", () => {
  assert.deepEqual(
    normalizeSessionSnapshot({
      params: {
        bg: "#123456",
        fg: "#654321",
        m: "05",
        pc: "#abcdef",
        s: "07",
        title: " Session ",
      },
      state: {
        elapsedTime: 5,
        isPaused: false,
        isStarted: true,
        revision: 2,
        totalDuration: 307,
      },
    }),
    {
      params: {
        bg: "#123456",
        fg: "#654321",
        m: "05",
        pc: "#abcdef",
        s: "07",
        title: "Session",
      },
      state: {
        elapsedTime: 5,
        isPaused: false,
        isStarted: true,
        revision: 2,
        totalDuration: 307,
      },
    },
  )
})

test("normalizeRelayClientMessage rejects malformed, oversized, and unexpected payloads", () => {
  assert.equal(normalizeRelayClientMessage("nope"), null)

  assert.equal(
    normalizeRelayClientMessage(
      JSON.stringify({
        clientId: "client-1",
        sessionId: "session-1",
        title: "bad",
        type: "sync",
      }),
    ),
    null,
  )

  assert.equal(
    normalizeRelayClientMessage("x".repeat(MAX_CLIENT_MESSAGE_BYTES + 1)),
    null,
  )
})

test("normalizeRelayClientMessage sanitizes valid sync payloads", () => {
  assert.deepEqual(
    normalizeRelayClientMessage(
      JSON.stringify({
        clientId: "client-1",
        params: {
          title: "  <script>alert(1)</script>  ",
        },
        sessionId: "session-1",
        state: {
          elapsedTime: 10,
          isPaused: false,
          isStarted: true,
          revision: 4,
          totalDuration: 75,
        },
        type: "sync",
      }),
    ),
    {
      clientId: "client-1",
      params: {
        title: "<script>alert(1)</script>",
      },
      sessionId: "session-1",
      state: {
        elapsedTime: 10,
        isPaused: false,
        isStarted: true,
        revision: 4,
        totalDuration: 75,
      },
      type: "sync",
    },
  )
})

test("normalizeRelayServerMessage rejects malformed session payloads", () => {
  assert.equal(
    normalizeRelayServerMessage(
      JSON.stringify({
        participants: [{ canControl: true, clientId: "client-1", extra: true }],
        sessionId: "session-1",
        snapshot: {},
        type: "session",
      }),
    ),
    null,
  )
})
