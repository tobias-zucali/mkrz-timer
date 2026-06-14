import assert from "node:assert/strict"
import test from "node:test"

import {
  DEFAULT_SYNC_PARAMS,
  DEFAULT_TIMER_STATE,
} from "../../shared/security/input.ts"
import type { SessionSnapshot } from "../../shared/liveSession/types.ts"
import {
  applyTimerCommandToSnapshot,
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

test("resolveSessionSnapshotAt respects runtime-extended total duration while running", () => {
  const resolved = resolveSessionSnapshotAt(
    {
      params: {
        ...DEFAULT_SYNC_PARAMS,
        rows: [
          {
            ...DEFAULT_SYNC_PARAMS.rows[0],
            totalSeconds: 300,
          },
        ],
      },
      state: {
        ...DEFAULT_TIMER_STATE,
        anchorServerTimestamp: 1_000,
        currentRepeat: 1,
        durationSeconds: 300,
        elapsedSecondsAtAnchor: 300,
        elapsedTime: 300,
        isPaused: false,
        isStarted: true,
        lastUpdatedAt: 1_000,
        revision: 3,
        status: "running",
        totalDuration: 360,
      },
    },
    1_000,
  )

  assert.equal(resolved.state.status, "running")
  assert.equal(resolved.state.durationSeconds, 300)
  assert.equal(resolved.state.totalDuration, 360)
  assert.equal(resolved.state.elapsedTime, 300)
})

test("applyTimerCommandToSnapshot ignores start when duration is zero", () => {
  const snapshot = {
    params: {
      ...DEFAULT_SYNC_PARAMS,
      m: "00",
      rows: [
        {
          ...DEFAULT_SYNC_PARAMS.rows[0],
          totalSeconds: 0,
        },
      ],
      s: "00",
    },
    state: {
      ...DEFAULT_TIMER_STATE,
      currentRepeat: 1,
      durationSeconds: 0,
      elapsedSecondsAtAnchor: 0,
      elapsedTime: 0,
      isPaused: true,
      isStarted: false,
      revision: 4,
      status: "idle" as const,
      totalDuration: 0,
    },
  } satisfies SessionSnapshot

  const nextSnapshot = applyTimerCommandToSnapshot({
    command: { type: "start" },
    now: 10_000,
    snapshot,
  })

  assert.deepEqual(nextSnapshot, resolveSessionSnapshotAt(snapshot, 10_000))
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

test("resolveSessionSnapshotAt auto-advances running steps", () => {
  const resolved = resolveSessionSnapshotAt(
    {
      params: {
        ...DEFAULT_SYNC_PARAMS,
        activeIndex: 0,
        rows: [
          {
            ...DEFAULT_SYNC_PARAMS.rows[0],
            endBehavior: "advance",
            title: "Intro",
            totalSeconds: 10,
          },
          {
            ...DEFAULT_SYNC_PARAMS.rows[0],
            title: "Discussion",
            totalSeconds: 20,
          },
        ],
      },
      state: {
        ...DEFAULT_TIMER_STATE,
        anchorServerTimestamp: 1_000,
        currentRepeat: 1,
        durationSeconds: 10,
        elapsedSecondsAtAnchor: 0,
        elapsedTime: 0,
        isPaused: false,
        isStarted: true,
        lastUpdatedAt: 1_000,
        revision: 1,
        status: "running",
        totalDuration: 10,
      },
    },
    11_000,
  )

  assert.equal(resolved.params.activeIndex, 1)
  assert.equal(resolved.state.status, "running")
  assert.equal(resolved.state.totalDuration, 20)
})

test("resolveSessionSnapshotAt advances repeats before moving to the next step", () => {
  const resolved = resolveSessionSnapshotAt(
    {
      params: {
        ...DEFAULT_SYNC_PARAMS,
        activeIndex: 0,
        rows: [
          {
            ...DEFAULT_SYNC_PARAMS.rows[0],
            endBehavior: "advance",
            repeatCount: 2,
            title: "Intro",
            totalSeconds: 10,
          },
          {
            ...DEFAULT_SYNC_PARAMS.rows[0],
            title: "Discussion",
            totalSeconds: 20,
          },
        ],
      },
      state: {
        ...DEFAULT_TIMER_STATE,
        anchorServerTimestamp: 1_000,
        currentRepeat: 1,
        durationSeconds: 10,
        elapsedSecondsAtAnchor: 0,
        elapsedTime: 0,
        isPaused: false,
        isStarted: true,
        lastUpdatedAt: 1_000,
        revision: 1,
        status: "running",
        totalDuration: 10,
      },
    },
    11_000,
  )

  assert.equal(resolved.params.activeIndex, 0)
  assert.equal(resolved.state.currentRepeat, 2)
  assert.equal(resolved.state.status, "running")
})

test("resolveSessionSnapshotAt finishes terminal stop steps", () => {
  const resolved = resolveSessionSnapshotAt(
    {
      params: {
        ...DEFAULT_SYNC_PARAMS,
        rows: [
          {
            ...DEFAULT_SYNC_PARAMS.rows[0],
            endBehavior: "stop",
            title: "Wrap",
            totalSeconds: 10,
          },
        ],
      },
      state: {
        ...DEFAULT_TIMER_STATE,
        anchorServerTimestamp: 1_000,
        currentRepeat: 1,
        durationSeconds: 10,
        elapsedSecondsAtAnchor: 0,
        elapsedTime: 0,
        isPaused: false,
        isStarted: true,
        lastUpdatedAt: 1_000,
        revision: 1,
        status: "running",
        totalDuration: 10,
      },
    },
    11_000,
  )

  assert.equal(resolved.params.activeIndex, 0)
  assert.equal(resolved.state.status, "finished")
  assert.equal(resolved.state.elapsedTime, 10)
})

test("resolveSessionSnapshotAt wraps auto-advance from the last step", () => {
  const resolved = resolveSessionSnapshotAt(
    {
      params: {
        ...DEFAULT_SYNC_PARAMS,
        activeIndex: 1,
        rows: [
          {
            ...DEFAULT_SYNC_PARAMS.rows[0],
            title: "Intro",
            totalSeconds: 10,
          },
          {
            ...DEFAULT_SYNC_PARAMS.rows[0],
            endBehavior: "advance",
            title: "Outro",
            totalSeconds: 20,
          },
        ],
      },
      state: {
        ...DEFAULT_TIMER_STATE,
        anchorServerTimestamp: 1_000,
        currentRepeat: 1,
        durationSeconds: 20,
        elapsedSecondsAtAnchor: 0,
        elapsedTime: 0,
        isPaused: false,
        isStarted: true,
        lastUpdatedAt: 1_000,
        revision: 1,
        status: "running",
        totalDuration: 20,
      },
    },
    21_000,
  )

  assert.equal(resolved.params.activeIndex, 0)
  assert.equal(resolved.state.status, "running")
  assert.equal(resolved.state.totalDuration, 10)
})

test("applyTimerCommandToSnapshot ignores previous at the first step", () => {
  const resolved = applyTimerCommandToSnapshot({
    command: { type: "previous" },
    now: 5_000,
    snapshot: {
      params: DEFAULT_SYNC_PARAMS,
      state: DEFAULT_TIMER_STATE,
    },
  })

  assert.equal(resolved.params.activeIndex, 0)
  assert.equal(resolved.state.status, "idle")
  assert.equal(resolved.state.revision, 0)
})

test("applyTimerCommandToSnapshot increases idle step duration by one minute", () => {
  const resolved = applyTimerCommandToSnapshot({
    command: { type: "increase-minute" },
    now: 5_000,
    snapshot: {
      params: {
        ...DEFAULT_SYNC_PARAMS,
        rows: [
          {
            ...DEFAULT_SYNC_PARAMS.rows[0],
            totalSeconds: 30,
          },
        ],
      },
      state: DEFAULT_TIMER_STATE,
    },
  })

  assert.equal(resolved.params.rows[0]?.totalSeconds, 90)
  assert.equal(resolved.params.m, "01")
  assert.equal(resolved.params.s, "30")
  assert.equal(resolved.state.status, "idle")
  assert.equal(resolved.state.totalDuration, 90)
})

test("applyTimerCommandToSnapshot keeps idle step duration at one minute minimum", () => {
  const resolved = applyTimerCommandToSnapshot({
    command: { type: "decrease-minute" },
    now: 5_000,
    snapshot: {
      params: {
        ...DEFAULT_SYNC_PARAMS,
        rows: [
          {
            ...DEFAULT_SYNC_PARAMS.rows[0],
            totalSeconds: 30,
          },
        ],
      },
      state: DEFAULT_TIMER_STATE,
    },
  })

  assert.equal(resolved.params.rows[0]?.totalSeconds, 60)
  assert.equal(resolved.params.m, "01")
  assert.equal(resolved.params.s, "00")
  assert.equal(resolved.state.status, "idle")
  assert.equal(resolved.state.totalDuration, 60)
})

test("applyTimerCommandToSnapshot adjusts running remaining time by one minute", () => {
  const resolved = applyTimerCommandToSnapshot({
    command: { type: "increase-minute" },
    now: 10_000,
    snapshot: {
      params: {
        ...DEFAULT_SYNC_PARAMS,
        rows: [
          {
            ...DEFAULT_SYNC_PARAMS.rows[0],
            totalSeconds: 300,
          },
        ],
      },
      state: {
        ...DEFAULT_TIMER_STATE,
        anchorServerTimestamp: 4_000,
        currentRepeat: 1,
        durationSeconds: 300,
        elapsedSecondsAtAnchor: 120,
        elapsedTime: 120,
        isPaused: false,
        isStarted: true,
        lastUpdatedAt: 4_000,
        revision: 1,
        status: "running",
        totalDuration: 300,
      },
    },
  })

  assert.equal(resolved.state.status, "running")
  assert.equal(resolved.state.durationSeconds, 300)
  assert.equal(resolved.state.elapsedSecondsAtAnchor, 126)
  assert.equal(resolved.state.totalDuration, 360)
  assert.equal(resolved.params.rows[0]?.totalSeconds, 300)
})

test("applyTimerCommandToSnapshot extends running time without mutating row duration near the start", () => {
  const resolved = applyTimerCommandToSnapshot({
    command: { type: "increase-minute" },
    now: 10_000,
    snapshot: {
      params: {
        ...DEFAULT_SYNC_PARAMS,
        rows: [
          {
            ...DEFAULT_SYNC_PARAMS.rows[0],
            totalSeconds: 300,
          },
        ],
      },
      state: {
        ...DEFAULT_TIMER_STATE,
        anchorServerTimestamp: 4_000,
        currentRepeat: 1,
        durationSeconds: 300,
        elapsedSecondsAtAnchor: 10,
        elapsedTime: 10,
        isPaused: false,
        isStarted: true,
        lastUpdatedAt: 4_000,
        revision: 1,
        status: "running",
        totalDuration: 300,
      },
    },
  })

  assert.equal(resolved.state.status, "running")
  assert.equal(resolved.state.durationSeconds, 300)
  assert.equal(resolved.state.elapsedSecondsAtAnchor, 16)
  assert.equal(resolved.state.totalDuration, 360)
  assert.equal(resolved.params.rows[0]?.totalSeconds, 300)
})

test("applyTimerCommandToSnapshot restores a finished stop step to one minute and restarts it", () => {
  const resolved = applyTimerCommandToSnapshot({
    command: { type: "increase-minute" },
    now: 5_000,
    snapshot: {
      params: {
        ...DEFAULT_SYNC_PARAMS,
        rows: [
          {
            ...DEFAULT_SYNC_PARAMS.rows[0],
            endBehavior: "stop",
            totalSeconds: 30,
          },
        ],
      },
      state: {
        ...DEFAULT_TIMER_STATE,
        currentRepeat: 1,
        durationSeconds: 30,
        elapsedSecondsAtAnchor: 30,
        elapsedTime: 30,
        isPaused: true,
        isStarted: true,
        lastUpdatedAt: 4_000,
        revision: 2,
        status: "finished",
        totalDuration: 30,
      },
    },
  })

  assert.equal(resolved.params.rows[0]?.totalSeconds, 60)
  assert.equal(resolved.state.status, "running")
  assert.equal(resolved.state.elapsedSecondsAtAnchor, 0)
  assert.equal(resolved.state.totalDuration, 60)
})

test("applyTimerCommandToSnapshot ignores decrease-minute on a finished stop step", () => {
  const resolved = applyTimerCommandToSnapshot({
    command: { type: "decrease-minute" },
    now: 5_000,
    snapshot: {
      params: DEFAULT_SYNC_PARAMS,
      state: {
        ...DEFAULT_TIMER_STATE,
        currentRepeat: 1,
        durationSeconds: 60,
        elapsedSecondsAtAnchor: 60,
        elapsedTime: 60,
        isPaused: true,
        isStarted: true,
        lastUpdatedAt: 4_000,
        revision: 2,
        status: "finished",
        totalDuration: 60,
      },
    },
  })

  assert.equal(resolved.state.revision, 2)
  assert.equal(resolved.state.status, "finished")
  assert.equal(resolved.state.elapsedSecondsAtAnchor, 60)
})
