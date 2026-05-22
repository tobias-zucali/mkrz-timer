import assert from "node:assert/strict"
import test from "node:test"

import {
  DEFAULT_SYNC_PARAMS,
  DEFAULT_TIMER_STATE,
} from "../../shared/security/input.ts"
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
          ...DEFAULT_SYNC_PARAMS,
          rows: [
            {
              ...DEFAULT_SYNC_PARAMS.rows[0],
              title: "Local",
            },
          ],
          title: "Local",
        },
        syncState: DEFAULT_TIMER_STATE,
      },
      onSessionSync: {
        applySnapshot: () => undefined,
        completeConnect: () => undefined,
        deferSnapshot: () => undefined,
        log: () => undefined,
        markConnected: (wasReconnect: boolean) => {
          markedReconnect = wasReconnect
        },
        setAccessTokens: () => undefined,
        setParticipants: () => undefined,
        setSessionId: () => undefined,
        shouldDeferSnapshot: () => false,
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
          ...DEFAULT_SYNC_PARAMS,
          rows: [
            {
              ...DEFAULT_SYNC_PARAMS.rows[0],
              title: "Local",
            },
          ],
          title: "Local",
        },
        state: DEFAULT_TIMER_STATE,
      },
    },
  })

  assert.equal(getMarkedReconnect(), false)
})

test("session sync can defer snapshot application until conflict resolution", () => {
  let deferred = false
  const { context, getMarkedReconnect } = createContext({
    hasConnectedOnce: true,
  })
  context.onSessionSync.shouldDeferSnapshot = () => true
  context.onSessionSync.deferSnapshot = () => {
    deferred = true
  }

  applyServerMessage({
    context,
    message: {
      type: "session",
      participants: [{ canControl: true, clientId: "client-1" }],
      sessionId: "session-1",
      snapshot: {
        params: {
          ...DEFAULT_SYNC_PARAMS,
          rows: [
            {
              ...DEFAULT_SYNC_PARAMS.rows[0],
              title: "Local",
            },
          ],
          title: "Local",
        },
        state: DEFAULT_TIMER_STATE,
      },
    },
  })

  assert.equal(deferred, true)
  assert.equal(getMarkedReconnect(), null)
})

test("error messages become retryable failures", () => {
  const { context, getRetryableFailure } = createContext()

  applyServerMessage({
    context,
    message: {
      type: "error",
      message: "Live session expired",
    },
  })

  assert.equal(getRetryableFailure()?.message, "Live session expired")
})
