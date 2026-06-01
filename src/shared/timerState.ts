import type { SessionSnapshot, TimerStatus } from "./liveSession/types.ts"
import { getActiveTimerSequenceRow } from "./timerSequence.ts"

type TimerState = SessionSnapshot["state"]
type SyncParams = SessionSnapshot["params"]

const clampElapsedSeconds = ({
  durationSeconds,
  elapsedSeconds,
}: {
  durationSeconds: number
  elapsedSeconds: number
}) => {
  if (elapsedSeconds < 0) {
    return 0
  }

  if (elapsedSeconds > durationSeconds) {
    return durationSeconds
  }

  return elapsedSeconds
}

const getRowDurationSeconds = ({
  params,
  state,
}: {
  params: SyncParams
  state: TimerState
}) =>
  getActiveTimerSequenceRow({
    activeIndex: params.activeIndex,
    rows: params.rows,
  }).row.totalSeconds ??
  state.durationSeconds ??
  state.totalDuration

const getClampedActiveIndex = ({
  activeIndex,
  rows,
}: {
  activeIndex: number
  rows: SyncParams["rows"]
}) =>
  getActiveTimerSequenceRow({
    activeIndex,
    rows,
  }).activeIndex

const buildTimerState = ({
  anchorServerTimestamp,
  currentRepeat,
  durationSeconds,
  elapsedSecondsAtAnchor,
  revision,
  status,
}: {
  anchorServerTimestamp: number
  currentRepeat: number
  durationSeconds: number
  elapsedSecondsAtAnchor: number
  revision: number
  status: TimerStatus
}): TimerState => {
  const isStarted = status !== "idle"
  const isPaused = status !== "running"

  return {
    anchorServerTimestamp: status === "running" ? anchorServerTimestamp : 0,
    currentRepeat,
    durationSeconds,
    elapsedSecondsAtAnchor,
    elapsedTime: elapsedSecondsAtAnchor,
    isPaused,
    isStarted,
    lastUpdatedAt: anchorServerTimestamp,
    revision,
    status,
    totalDuration: durationSeconds,
  }
}

export const buildStateForActiveRow = ({
  now,
  revision,
  snapshot,
  status,
}: {
  now: number
  revision: number
  snapshot: SessionSnapshot
  status: TimerStatus
}): TimerState => {
  const durationSeconds = Math.max(
    0,
    getRowDurationSeconds({
      params: snapshot.params,
      state: snapshot.state,
    }),
  )
  const elapsedSecondsAtAnchor = status === "finished" ? durationSeconds : 0

  return buildTimerState({
    anchorServerTimestamp: now,
    currentRepeat: 1,
    durationSeconds,
    elapsedSecondsAtAnchor,
    revision,
    status,
  })
}

const getElapsedAt = (state: TimerState, now: number) => {
  if (state.status !== "running" || state.anchorServerTimestamp <= 0) {
    return state.elapsedSecondsAtAnchor
  }

  return (
    state.elapsedSecondsAtAnchor +
    Math.max(0, now - state.anchorServerTimestamp) / 1000
  )
}

const continueSequenceAt = ({
  now,
  params,
  state,
}: {
  now: number
  params: SyncParams
  state: TimerState
}): SessionSnapshot => {
  let nextParams = params
  let nextRepeat = Math.max(1, state.currentRepeat)
  let nextDurationSeconds = Math.max(
    0,
    getRowDurationSeconds({ params, state }),
  )
  let remainingElapsed = getElapsedAt(state, now)

  while (
    remainingElapsed >= nextDurationSeconds &&
    state.status === "running"
  ) {
    if (nextDurationSeconds === 0) {
      return {
        params: nextParams,
        state: buildTimerState({
          anchorServerTimestamp: now,
          currentRepeat: nextRepeat,
          durationSeconds: 0,
          elapsedSecondsAtAnchor: 0,
          revision: state.revision,
          status: "finished",
        }),
      }
    }

    const activeRowSnapshot = getActiveTimerSequenceRow({
      activeIndex: nextParams.activeIndex,
      rows: nextParams.rows,
    })
    const activeRow = activeRowSnapshot.row
    remainingElapsed -= nextDurationSeconds

    if (nextRepeat < activeRow.repeatCount) {
      nextRepeat += 1
      continue
    }

    if (activeRow.endBehavior === "advance") {
      const nextIndex =
        nextParams.rows.length <= 1
          ? activeRowSnapshot.activeIndex
          : (activeRowSnapshot.activeIndex + 1) % nextParams.rows.length
      nextParams = {
        ...nextParams,
        activeIndex: nextIndex,
      }
      nextRepeat = 1
      nextDurationSeconds = getActiveTimerSequenceRow({
        activeIndex: nextIndex,
        rows: nextParams.rows,
      }).row.totalSeconds
      continue
    }

    return {
      params: nextParams,
      state: buildTimerState({
        anchorServerTimestamp: now,
        currentRepeat: nextRepeat,
        durationSeconds: nextDurationSeconds,
        elapsedSecondsAtAnchor: nextDurationSeconds,
        revision: state.revision,
        status: "finished",
      }),
    }
  }

  return {
    params: nextParams,
    state: buildTimerState({
      anchorServerTimestamp: now,
      currentRepeat: nextRepeat,
      durationSeconds: nextDurationSeconds,
      elapsedSecondsAtAnchor: clampElapsedSeconds({
        durationSeconds: nextDurationSeconds,
        elapsedSeconds: remainingElapsed,
      }),
      revision: state.revision,
      status: "running",
    }),
  }
}

export const resolveSessionSnapshotAt = (
  snapshot: SessionSnapshot,
  now = Date.now(),
): SessionSnapshot => {
  const durationSeconds = Math.max(
    0,
    getRowDurationSeconds({
      params: snapshot.params,
      state: snapshot.state,
    }),
  )
  const normalizedState = buildTimerState({
    anchorServerTimestamp:
      snapshot.state.status === "running"
        ? snapshot.state.anchorServerTimestamp || snapshot.state.lastUpdatedAt
        : now,
    currentRepeat: Math.max(1, snapshot.state.currentRepeat),
    durationSeconds,
    elapsedSecondsAtAnchor: clampElapsedSeconds({
      durationSeconds,
      elapsedSeconds:
        snapshot.state.elapsedSecondsAtAnchor ?? snapshot.state.elapsedTime,
    }),
    revision: snapshot.state.revision,
    status: snapshot.state.status,
  })

  if (normalizedState.status === "running") {
    return continueSequenceAt({
      now,
      params: snapshot.params,
      state: normalizedState,
    })
  }

  const pausedStatus =
    normalizedState.status === "finished" &&
    normalizedState.elapsedSecondsAtAnchor < durationSeconds
      ? "paused"
      : normalizedState.status

  return {
    params: snapshot.params,
    state: buildTimerState({
      anchorServerTimestamp: now,
      currentRepeat: normalizedState.currentRepeat,
      durationSeconds,
      elapsedSecondsAtAnchor:
        pausedStatus === "idle"
          ? 0
          : clampElapsedSeconds({
              durationSeconds,
              elapsedSeconds:
                pausedStatus === "finished"
                  ? durationSeconds
                  : normalizedState.elapsedSecondsAtAnchor,
            }),
      revision: normalizedState.revision,
      status: pausedStatus,
    }),
  }
}

export const resolveTimerStateAt = (
  state: TimerState,
  now = Date.now(),
): TimerState =>
  resolveSessionSnapshotAt(
    {
      params: {
        activeIndex: 0,
        bg: "#000000",
        fg: "#ffffff",
        m: "00",
        pc: "#ffffff",
        rows: [
          {
            endBehavior: "stop",
            primaryColor: "#ffffff",
            repeatCount: 1,
            title: "",
            totalSeconds: state.durationSeconds || state.totalDuration,
          },
        ],
        s: "00",
        snd: "a",
        tts: false,
        title: "",
      },
      state,
    },
    now,
  ).state

export const stampSessionSnapshotAt = (
  snapshot: SessionSnapshot,
  now = Date.now(),
): SessionSnapshot => resolveSessionSnapshotAt(snapshot, now)

export const stampTimerStateAt = (
  state: TimerState,
  now = Date.now(),
): TimerState => resolveTimerStateAt(state, now)

export const applyTimerCommandToSnapshot = ({
  command,
  now = Date.now(),
  snapshot,
}: {
  command:
    | { type: "activate"; activeIndex: number }
    | { type: "next" | "pause" | "previous" | "reset" | "start" }
  now?: number
  snapshot: SessionSnapshot
}): SessionSnapshot => {
  const resolvedSnapshot = resolveSessionSnapshotAt(snapshot, now)
  const nextRevision = resolvedSnapshot.state.revision + 1

  switch (command.type) {
    case "start":
      if (resolvedSnapshot.state.status === "running") {
        return resolvedSnapshot
      }

      return {
        params: resolvedSnapshot.params,
        state: buildTimerState({
          anchorServerTimestamp: now,
          currentRepeat: resolvedSnapshot.state.currentRepeat,
          durationSeconds: resolvedSnapshot.state.durationSeconds,
          elapsedSecondsAtAnchor: resolvedSnapshot.state.elapsedSecondsAtAnchor,
          revision: nextRevision,
          status: "running",
        }),
      }
    case "pause": {
      if (resolvedSnapshot.state.status !== "running") {
        return resolvedSnapshot
      }

      const pausedSnapshot = resolveSessionSnapshotAt(resolvedSnapshot, now)
      const status =
        pausedSnapshot.state.elapsedSecondsAtAnchor >=
        pausedSnapshot.state.durationSeconds
          ? "finished"
          : "paused"

      return {
        params: pausedSnapshot.params,
        state: buildTimerState({
          anchorServerTimestamp: now,
          currentRepeat: pausedSnapshot.state.currentRepeat,
          durationSeconds: pausedSnapshot.state.durationSeconds,
          elapsedSecondsAtAnchor: pausedSnapshot.state.elapsedSecondsAtAnchor,
          revision: nextRevision,
          status,
        }),
      }
    }
    case "reset":
      return {
        params: resolvedSnapshot.params,
        state: buildStateForActiveRow({
          now,
          revision: nextRevision,
          snapshot: resolvedSnapshot,
          status: "idle",
        }),
      }
    case "next":
    case "previous": {
      const direction = command.type === "next" ? 1 : -1
      const nextIndex = getClampedActiveIndex({
        activeIndex: resolvedSnapshot.params.activeIndex + direction,
        rows: resolvedSnapshot.params.rows,
      })
      if (nextIndex === resolvedSnapshot.params.activeIndex) {
        return resolvedSnapshot
      }
      const nextSnapshot = {
        ...resolvedSnapshot,
        params: {
          ...resolvedSnapshot.params,
          activeIndex: nextIndex,
        },
      }

      return {
        params: nextSnapshot.params,
        state: buildStateForActiveRow({
          now,
          revision: nextRevision,
          snapshot: nextSnapshot,
          status: "idle",
        }),
      }
    }
    case "activate": {
      const nextIndex = getClampedActiveIndex({
        activeIndex: command.activeIndex,
        rows: resolvedSnapshot.params.rows,
      })
      const nextSnapshot = {
        ...resolvedSnapshot,
        params: {
          ...resolvedSnapshot.params,
          activeIndex: nextIndex,
        },
      }

      return {
        params: nextSnapshot.params,
        state: buildStateForActiveRow({
          now,
          revision: nextRevision,
          snapshot: nextSnapshot,
          status: "idle",
        }),
      }
    }
  }
}

export const sessionSnapshotsMatch = ({
  currentSnapshot,
  incomingSnapshot,
  now = Date.now(),
}: {
  currentSnapshot: SessionSnapshot
  incomingSnapshot: SessionSnapshot
  now?: number
}) => {
  const resolvedCurrentSnapshot = resolveSessionSnapshotAt(currentSnapshot, now)
  const resolvedIncomingSnapshot = resolveSessionSnapshotAt(
    incomingSnapshot,
    now,
  )

  return (
    resolvedCurrentSnapshot.params.activeIndex ===
      resolvedIncomingSnapshot.params.activeIndex &&
    resolvedCurrentSnapshot.params.bg === resolvedIncomingSnapshot.params.bg &&
    resolvedCurrentSnapshot.params.fg === resolvedIncomingSnapshot.params.fg &&
    JSON.stringify(resolvedCurrentSnapshot.params.rows) ===
      JSON.stringify(resolvedIncomingSnapshot.params.rows) &&
    resolvedCurrentSnapshot.state.currentRepeat ===
      resolvedIncomingSnapshot.state.currentRepeat &&
    resolvedCurrentSnapshot.state.status ===
      resolvedIncomingSnapshot.state.status &&
    resolvedCurrentSnapshot.state.durationSeconds ===
      resolvedIncomingSnapshot.state.durationSeconds &&
    Math.abs(
      resolvedCurrentSnapshot.state.elapsedSecondsAtAnchor -
        resolvedIncomingSnapshot.state.elapsedSecondsAtAnchor,
    ) <= 1
  )
}
