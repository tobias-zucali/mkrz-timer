import assert from "node:assert/strict"
import { test } from "node:test"

import {
  createAppTranslator,
  type AppTranslationFn,
} from "../../i18n/translator.ts"

import getLiveSessionStatus from "./index.ts"

const t = createAppTranslator() as AppTranslationFn

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
      t,
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
    t,
  })

  assert.deepEqual(status, {
    canRetryManually: false,
    connectionSummary: "Waiting for timer sync",
    description: "Starting or joining the shared timer with manage access.",
    hasControllingParticipant: false,
    role: "control",
    roleLabel: "Manage session",
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
    t,
  })

  assert.deepEqual(status, {
    canRetryManually: false,
    connectionSummary: "Managing with 2 other participants",
    description: "Can manage the shared timer and settings.",
    hasControllingParticipant: true,
    role: "control",
    roleLabel: "Manage session",
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
    t,
  })

  assert.deepEqual(status, {
    canRetryManually: false,
    connectionSummary: "Joined with 1 other participant",
    description: "Joined the shared timer without manage access.",
    hasControllingParticipant: true,
    role: "readonly",
    roleLabel: "Join session",
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
    t,
  })

  assert.deepEqual(status, {
    canRetryManually: true,
    connectionSummary: "Recovery needs a retry",
    description: "Automatic recovery failed. Retry to reconnect.",
    hasControllingParticipant: false,
    role: "readonly",
    roleLabel: "Join session",
    state: "failed",
    stateLabel: "Reconnect failed",
  })
})
