import assert from "node:assert/strict"
import test from "node:test"

import {
  DEFAULT_SYNC_PARAMS,
  MAX_CLIENT_MESSAGE_BYTES,
  MAX_TITLE_LENGTH,
  normalizeRemoteAccessToken,
  normalizeQueryParams,
  normalizeRelayClientMessage,
  normalizeRelayServerMessage,
  normalizeSessionSnapshot,
  normalizeSyncParamPatch,
  normalizeSyncParams,
  normalizeTitle,
  normalizeTimerState,
} from "./input.ts"

test("normalizeTitle treats user input as plain text and strips unsafe control characters", () => {
  const maliciousTitle =
    '  <img src=x onerror="window.__xss = 1">\u0000<script>alert(1)</script>  '
  const expectedTitle =
    '  <img src=x onerror="window.__xss = 1"><script>alert(1)</script>  '.slice(
      0,
      MAX_TITLE_LENGTH,
    )

  assert.equal(normalizeTitle(maliciousTitle), expectedTitle)
})

test("normalizeTitle preserves ordinary spaces while normalizing line breaks", () => {
  assert.equal(normalizeTitle("a b"), "a b")
  assert.equal(normalizeTitle("a\tb\nc"), "a b\nc")
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
      fg: "#ABCDEF",
      m: "9999",
      pc: "ff00gg",
      s: "-5",
      title: "  Hello<script>  ",
      unexpected: "ignored",
    }),
    {
      ...DEFAULT_SYNC_PARAMS,
      fg: "#abcdef",
      pid: "",
      title: "  Hello<script>  ",
    },
  )
})

test("normalizeRemoteAccessToken rejects malformed values", () => {
  assert.equal(normalizeRemoteAccessToken("<script>"), null)
  assert.equal(normalizeRemoteAccessToken("viewer_token"), "viewer_token")
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
      title: '  <b onclick="boom()">Title</b>  ',
    },
  )
})

test("normalizeSyncParams uses caller fallback for duration fields", () => {
  assert.deepEqual(
    normalizeSyncParams(
      {
        bg: "123456",
        fg: "abcdef",
        m: "nope",
        pc: "fedcba",
        s: "-1",
      },
      {
        ...DEFAULT_SYNC_PARAMS,
        m: "03",
        s: "20",
      },
    ),
    {
      bg: "#123456",
      fg: "#abcdef",
      m: "03",
      pc: "#fedcba",
      s: "20",
      title: "",
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
      lastUpdatedAt: 0,
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
        lastUpdatedAt: 0,
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
        title: " Session ",
      },
      state: {
        elapsedTime: 5,
        isPaused: false,
        isStarted: true,
        lastUpdatedAt: 0,
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
        token: "token-1",
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
        title: "  <script>alert(1)</script>  ",
      },
      sessionId: "session-1",
      state: {
        elapsedTime: 10,
        isPaused: false,
        isStarted: true,
        lastUpdatedAt: 0,
        revision: 4,
        totalDuration: 75,
      },
      type: "sync",
    },
  )
})

test("normalizeRelayClientMessage accepts token-based join messages", () => {
  assert.deepEqual(
    normalizeRelayClientMessage(
      JSON.stringify({
        clientId: "client-1",
        role: "readonly",
        token: "viewer-1",
        type: "join-session",
      }),
    ),
    {
      clientId: "client-1",
      role: "readonly",
      token: "viewer-1",
      type: "join-session",
    },
  )
})

test("normalizeRelayServerMessage rejects malformed session payloads", () => {
  assert.equal(
    normalizeRelayServerMessage(
      JSON.stringify({
        accessTokens: {
          control: "control-token",
          readonly: "readonly-token",
        },
        participants: [{ canControl: true, clientId: "client-1", extra: true }],
        sessionId: "session-1",
        snapshot: {},
        type: "session",
      }),
    ),
    null,
  )
})

test("normalizeRelayServerMessage accepts control access tokens on session payloads", () => {
  assert.deepEqual(
    normalizeRelayServerMessage(
      JSON.stringify({
        accessTokens: {
          control: "control-token",
          readonly: "readonly-token",
        },
        participants: [{ canControl: true, clientId: "client-1" }],
        sessionId: "session-1",
        snapshot: {
          params: DEFAULT_SYNC_PARAMS,
          state: {
            elapsedTime: 0,
            isPaused: true,
            isStarted: false,
            lastUpdatedAt: 0,
            revision: 0,
            totalDuration: 60,
          },
        },
        type: "session",
      }),
    ),
    {
      accessTokens: {
        control: "control-token",
        readonly: "readonly-token",
      },
      participants: [{ canControl: true, clientId: "client-1" }],
      sessionId: "session-1",
      snapshot: {
        params: DEFAULT_SYNC_PARAMS,
        state: {
          elapsedTime: 0,
          isPaused: true,
          isStarted: false,
          lastUpdatedAt: 0,
          revision: 0,
          totalDuration: 60,
        },
      },
      type: "session",
    },
  )
})
