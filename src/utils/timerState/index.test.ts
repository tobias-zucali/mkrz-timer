import assert from "node:assert/strict"
import test from "node:test"

import {
  DEFAULT_SYNC_PARAMS,
  DEFAULT_TIMER_STATE,
} from "../../shared/security/input.ts"
import type { SessionSnapshot } from "../../shared/liveSession/types.ts"
import {
  resolveSessionSnapshotAt,
  resolveTimerStateAt,
  sessionSnapshotsMatch,
  stampTimerStateAt,
} from "./index.ts"

test("resolveTimerStateAt advances running timers by wall-clock delta", () => {
  const resolved = resolveTimerStateAt(
    {
      ...DEFAULT_TIMER_STATE,
      anchorServerTimestamp: 1_000,
      currentRepeat: 1,
      durationSeconds: 60,
      elapsedSecondsAtAnchor: 12,
      elapsedTime: 12,
      isPaused: false,
      isStarted: true,
      lastUpdatedAt: 1_000,
      revision: 3,
      status: "running",
      totalDuration: 60,
    },
    4_000,
  )

  assert.equal(resolved.elapsedTime, 15)
})

test("resolveSessionSnapshotAt preserves paused timers without adding elapsed time", () => {
  const resolved = resolveSessionSnapshotAt(
    {
      params: {
        ...DEFAULT_SYNC_PARAMS,
        rows: [
          {
            ...DEFAULT_SYNC_PARAMS.rows[0],
            title: "Paused",
          },
        ],
        title: "Paused",
      },
      state: {
        ...DEFAULT_TIMER_STATE,
        currentRepeat: 1,
        durationSeconds: 60,
        elapsedSecondsAtAnchor: 8,
        elapsedTime: 8,
        isPaused: true,
        isStarted: true,
        lastUpdatedAt: 1_000,
        revision: 3,
        status: "paused",
        totalDuration: 60,
      },
    },
    10_000,
  )

  assert.equal(resolved.state.elapsedTime, 8)
})

test("stampTimerStateAt refreshes the timestamp with the resolved current state", () => {
  const stamped = stampTimerStateAt(
    {
      ...DEFAULT_TIMER_STATE,
      anchorServerTimestamp: 2_000,
      currentRepeat: 1,
      durationSeconds: 60,
      elapsedSecondsAtAnchor: 5,
      elapsedTime: 5,
      isPaused: false,
      isStarted: true,
      lastUpdatedAt: 2_000,
      revision: 1,
      status: "running",
      totalDuration: 60,
    },
    6_000,
  )

  assert.equal(stamped.elapsedTime, 9)
  assert.equal(stamped.lastUpdatedAt, 6_000)
})

test("sessionSnapshotsMatch compares resolved current running state instead of stale stored elapsed values", () => {
  const currentSnapshot: SessionSnapshot = {
    params: {
      ...DEFAULT_SYNC_PARAMS,
      rows: [
        {
          ...DEFAULT_SYNC_PARAMS.rows[0],
          title: "Workshop",
        },
      ],
      title: "Workshop",
    },
    state: {
      ...DEFAULT_TIMER_STATE,
      anchorServerTimestamp: 2_000,
      currentRepeat: 1,
      durationSeconds: 60,
      elapsedSecondsAtAnchor: 5,
      elapsedTime: 5,
      isPaused: false,
      isStarted: true,
      lastUpdatedAt: 2_000,
      revision: 1,
      status: "running",
      totalDuration: 60,
    },
  }
  const incomingSnapshot: SessionSnapshot = {
    params: currentSnapshot.params,
    state: {
      ...DEFAULT_TIMER_STATE,
      anchorServerTimestamp: 4_000,
      currentRepeat: 1,
      durationSeconds: 60,
      elapsedSecondsAtAnchor: 7,
      elapsedTime: 7,
      isPaused: false,
      isStarted: true,
      lastUpdatedAt: 4_000,
      revision: 2,
      status: "running",
      totalDuration: 60,
    },
  }

  assert.equal(
    sessionSnapshotsMatch({
      currentSnapshot,
      incomingSnapshot,
      now: 7_000,
    }),
    true,
  )
})

test("sessionSnapshotsMatch treats paused and finished timers as different states", () => {
  const baseParams = {
    ...DEFAULT_SYNC_PARAMS,
    rows: [
      {
        ...DEFAULT_SYNC_PARAMS.rows[0],
        title: "Workshop",
      },
    ],
    title: "Workshop",
  }

  assert.equal(
    sessionSnapshotsMatch({
      currentSnapshot: {
        params: baseParams,
        state: {
          ...DEFAULT_TIMER_STATE,
          currentRepeat: 1,
          durationSeconds: 60,
          elapsedSecondsAtAnchor: 60,
          elapsedTime: 60,
          isPaused: true,
          isStarted: true,
          status: "paused",
          totalDuration: 60,
        },
      },
      incomingSnapshot: {
        params: baseParams,
        state: {
          ...DEFAULT_TIMER_STATE,
          currentRepeat: 1,
          durationSeconds: 60,
          elapsedSecondsAtAnchor: 60,
          elapsedTime: 60,
          isPaused: true,
          isStarted: true,
          status: "finished",
          totalDuration: 60,
        },
      },
    }),
    false,
  )
})

test("sessionSnapshotsMatch detects row and active-index differences", () => {
  const currentSnapshot: SessionSnapshot = {
    params: {
      ...DEFAULT_SYNC_PARAMS,
      activeIndex: 0,
      rows: [
        {
          ...DEFAULT_SYNC_PARAMS.rows[0],
          title: "Opening",
        },
        {
          ...DEFAULT_SYNC_PARAMS.rows[0],
          title: "Closing",
        },
      ],
      title: "Opening",
    },
    state: DEFAULT_TIMER_STATE,
  }

  assert.equal(
    sessionSnapshotsMatch({
      currentSnapshot,
      incomingSnapshot: {
        ...currentSnapshot,
        params: {
          ...currentSnapshot.params,
          activeIndex: 1,
          title: "Closing",
        },
      },
    }),
    false,
  )
})

test("sessionSnapshotsMatch rejects elapsed differences beyond tolerance", () => {
  assert.equal(
    sessionSnapshotsMatch({
      currentSnapshot: {
        params: DEFAULT_SYNC_PARAMS,
        state: {
          ...DEFAULT_TIMER_STATE,
          currentRepeat: 1,
          durationSeconds: 60,
          elapsedSecondsAtAnchor: 10,
          elapsedTime: 10,
          isPaused: true,
          isStarted: true,
          status: "paused",
          totalDuration: 60,
        },
      },
      incomingSnapshot: {
        params: DEFAULT_SYNC_PARAMS,
        state: {
          ...DEFAULT_TIMER_STATE,
          currentRepeat: 1,
          durationSeconds: 60,
          elapsedSecondsAtAnchor: 12.5,
          elapsedTime: 12.5,
          isPaused: true,
          isStarted: true,
          status: "paused",
          totalDuration: 60,
        },
      },
    }),
    false,
  )
})
