import assert from "node:assert/strict"
import { test } from "node:test"

import getLiveSessionStatus from "./index.ts"

test("returns null outside live sessions", () => {
  assert.equal(
    getLiveSessionStatus({
      canRetryManually: false,
      hasConnectedOnce: false,
      hasReceivedInitialSync: false,
      isRemoteEnabled: false,
      lifecycleState: "connecting",
      participantCount: 0,
      role: "control",
    }),
    null,
  )
})

test("describes pending control-session startup before the session id exists", () => {
  const status = getLiveSessionStatus({
    canRetryManually: false,
    hasConnectedOnce: false,
    hasReceivedInitialSync: false,
    isRemoteEnabled: false,
    lifecycleState: "connecting",
    participantCount: 1,
    role: "control",
    showPendingHostStatus: true,
  })

  assert.deepEqual(status, {
    canRetryManually: false,
    connectionSummary: "Waiting for timer sync",
    description: "Starting or joining the shared timer with control access.",
    hasControllingParticipant: false,
    role: "control",
    roleLabel: "Control session",
    state: "connecting",
    stateLabel: "Connecting",
  })
})

test("describes the connected control-session state", () => {
  const status = getLiveSessionStatus({
    canRetryManually: false,
    hasConnectedOnce: true,
    hasReceivedInitialSync: true,
    hasControllingParticipant: true,
    isRemoteEnabled: true,
    lifecycleState: "connected",
    participantCount: 3,
    role: "control",
  })

  assert.deepEqual(status, {
    canRetryManually: false,
    connectionSummary: "Controlling with 2 other participants",
    description: "Can control the shared timer and settings.",
    hasControllingParticipant: true,
    role: "control",
    roleLabel: "Control session",
    state: "connected",
    stateLabel: "Connected",
  })
})

test("describes a connected readonly session", () => {
  const status = getLiveSessionStatus({
    canRetryManually: false,
    hasConnectedOnce: true,
    hasReceivedInitialSync: true,
    hasControllingParticipant: true,
    isRemoteEnabled: true,
    lifecycleState: "connected",
    participantCount: 2,
    role: "readonly",
  })

  assert.deepEqual(status, {
    canRetryManually: false,
    connectionSummary: "Viewing with 1 other participant",
    description: "Viewing the shared timer without controls.",
    hasControllingParticipant: true,
    role: "readonly",
    roleLabel: "Readonly session",
    state: "connected",
    stateLabel: "Connected",
  })
})

test("describes a failed readonly recovery with retry available", () => {
  const status = getLiveSessionStatus({
    canRetryManually: true,
    hasConnectedOnce: true,
    hasReceivedInitialSync: false,
    isRemoteEnabled: true,
    lifecycleState: "failed",
    participantCount: 0,
    role: "readonly",
  })

  assert.deepEqual(status, {
    canRetryManually: true,
    connectionSummary: "Recovery needs a retry",
    description:
      "Automatic recovery could not restore the viewer connection yet. Retry to request a fresh sync.",
    hasControllingParticipant: false,
    role: "readonly",
    roleLabel: "Readonly session",
    state: "failed",
    stateLabel: "Reconnect failed",
  })
})
