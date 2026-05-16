import assert from "node:assert/strict"
import test from "node:test"

import { applyServerMessage } from "./state.ts"

const createContext = ({
  canPublishSessionState = true,
  hasConnectedOnce = false,
  hasReceivedInitialSync = false,
}: {
  canPublishSessionState?: boolean
  hasConnectedOnce?: boolean
  hasReceivedInitialSync?: boolean
} = {}) => {
  let syncCalls = 0
  let markedReconnect: boolean | null = null
  let retryableFailure: Error | null = null

  return {
    context: {
      onError: {
        failConnect: () => undefined,
        log: () => undefined,
        setRetryableFailure: (error: Error) => {
          retryableFailure = error
        },
      },
      onParticipantList: {
        canPublishSessionState,
        clientId: "client-1",
        hasReceivedInitialSync,
        log: () => undefined,
        sendMessage: () => {
          syncCalls += 1
          return true
        },
        setParticipants: () => undefined,
        setSessionId: () => undefined,
        syncParams: {
          bg: "#000000",
          fg: "#ffffff",
          m: "01",
          pc: "#d61f69",
          s: "00",
          title: "Local",
        },
        syncState: {
          elapsedTime: 0,
          isPaused: true,
          isStarted: false,
          revision: 0,
          totalDuration: 60,
        },
      },
      onSessionSync: {
        applySnapshot: () => undefined,
        completeConnect: () => undefined,
        log: () => undefined,
        markConnected: (wasReconnect: boolean) => {
          markedReconnect = wasReconnect
        },
        setParticipants: () => undefined,
        setSessionId: () => undefined,
      },
      wasReconnect: hasConnectedOnce,
    },
    getMarkedReconnect: () => markedReconnect,
    getRetryableFailure: () => retryableFailure,
    getSyncCalls: () => syncCalls,
  }
}

test("participant-list does not publish local state before initial sync", () => {
  const { context, getSyncCalls } = createContext({
    hasReceivedInitialSync: false,
  })

  applyServerMessage({
    context,
    message: {
      type: "participant-list",
      participants: [{ canControl: true, clientId: "client-1" }],
      sessionId: "session-1",
    },
  })

  assert.equal(getSyncCalls(), 0)
})

test("participant-list republishes state after initial sync for control clients", () => {
  const { context, getSyncCalls } = createContext({
    hasReceivedInitialSync: true,
  })

  applyServerMessage({
    context,
    message: {
      type: "participant-list",
      participants: [{ canControl: true, clientId: "client-1" }],
      sessionId: "session-1",
    },
  })

  assert.equal(getSyncCalls(), 1)
})

test("session sync marks initial connections as non-reconnects", () => {
  const { context, getMarkedReconnect } = createContext({
    hasConnectedOnce: false,
  })

  applyServerMessage({
    context,
    message: {
      type: "session",
      participants: [{ canControl: true, clientId: "client-1" }],
      sessionId: "session-1",
      snapshot: {
        params: {
          bg: "#000000",
          fg: "#ffffff",
          m: "01",
          pc: "#d61f69",
          s: "00",
          title: "Local",
        },
        state: {
          elapsedTime: 0,
          isPaused: true,
          isStarted: false,
          revision: 0,
          totalDuration: 60,
        },
      },
    },
  })

  assert.equal(getMarkedReconnect(), false)
})

test("error messages become retryable failures", () => {
  const { context, getRetryableFailure } = createContext()

  applyServerMessage({
    context,
    message: {
      type: "error",
      message: "Remote session expired",
    },
  })

  assert.equal(getRetryableFailure()?.message, "Remote session expired")
})
