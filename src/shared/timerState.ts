import type {
  SessionSnapshot,
  TimerCommand,
  TimerStatus,
} from "./liveSession/types.ts"
import {
  buildDurationPartsFromTotalSeconds,
  DEFAULT_TIMER_PRIMARY_COLOR,
  getActiveTimerSequenceRow,
  MAX_TIMER_DURATION_SECONDS,
} from "./timerSequence.ts"

type TimerState = SessionSnapshot["state"]
type SyncParams = SessionSnapshot["params"]
const MINUTE_SECONDS = 60

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

const clampDurationSeconds = (durationSeconds: number) =>
  Math.min(MAX_TIMER_DURATION_SECONDS, Math.max(0, durationSeconds))

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

const buildParamsWithRows = ({
  activeIndex = 0,
  params,
  rows,
}: {
  activeIndex?: number
  params: SyncParams
  rows: SyncParams["rows"]
}): SyncParams => {
  const activeRowSnapshot = getActiveTimerSequenceRow({
    activeIndex,
    rows,
  })
  const duration = buildDurationPartsFromTotalSeconds(
    activeRowSnapshot.row.totalSeconds,
  )

  return {
    ...params,
    activeIndex: activeRowSnapshot.activeIndex,
    m: duration.m,
    pc: activeRowSnapshot.row.primaryColor || DEFAULT_TIMER_PRIMARY_COLOR,
    rows: activeRowSnapshot.rows,
    s: duration.s,
    title: activeRowSnapshot.row.title,
  }
}

const updateActiveRow = ({
  params,
  update,
}: {
  params: SyncParams
  update: (row: SyncParams["rows"][number]) => SyncParams["rows"][number]
}) =>
  buildParamsWithRows({
    activeIndex: params.activeIndex,
    params,
    rows: params.rows.map((row, index) =>
      index === params.activeIndex ? update(row) : row,
    ),
  })

const buildTimerState = ({
  anchorServerTimestamp,
  currentRepeat,
  durationSeconds,
  elapsedSecondsAtAnchor,
  revision,
  status,
  totalDuration = durationSeconds,
}: {
  anchorServerTimestamp: number
  currentRepeat: number
  durationSeconds: number
  elapsedSecondsAtAnchor: number
  revision: number
  status: TimerStatus
  totalDuration?: number
}): TimerState => {
  const isStarted = status !== "idle"
  const isPaused = status !== "running"
  const clampedTotalDuration = clampDurationSeconds(totalDuration)

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
    totalDuration: clampedTotalDuration,
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
  let nextTotalDuration = clampDurationSeconds(state.totalDuration)
  let remainingElapsed = getElapsedAt(state, now)

  while (remainingElapsed >= nextTotalDuration && state.status === "running") {
    if (nextTotalDuration === 0) {
      return {
        params: nextParams,
        state: buildTimerState({
          anchorServerTimestamp: now,
          currentRepeat: nextRepeat,
          durationSeconds: 0,
          elapsedSecondsAtAnchor: 0,
          revision: state.revision,
          status: "finished",
          totalDuration: 0,
        }),
      }
    }

    const activeRowSnapshot = getActiveTimerSequenceRow({
      activeIndex: nextParams.activeIndex,
      rows: nextParams.rows,
    })
    const activeRow = activeRowSnapshot.row
    remainingElapsed -= nextTotalDuration

    if (nextRepeat < activeRow.repeatCount) {
      nextRepeat += 1
      nextTotalDuration = nextDurationSeconds
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
      nextTotalDuration = nextDurationSeconds
      continue
    }

    return {
      params: nextParams,
      state: buildTimerState({
        anchorServerTimestamp: now,
        currentRepeat: nextRepeat,
        durationSeconds: nextDurationSeconds,
        elapsedSecondsAtAnchor: nextTotalDuration,
        revision: state.revision,
        status: "finished",
        totalDuration: nextTotalDuration,
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
        durationSeconds: nextTotalDuration,
        elapsedSeconds: remainingElapsed,
      }),
      revision: state.revision,
      status: "running",
      totalDuration: nextTotalDuration,
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
  const totalDuration =
    snapshot.state.status === "idle"
      ? durationSeconds
      : clampDurationSeconds(snapshot.state.totalDuration ?? durationSeconds)
  const normalizedState = buildTimerState({
    anchorServerTimestamp:
      snapshot.state.status === "running"
        ? snapshot.state.anchorServerTimestamp || snapshot.state.lastUpdatedAt
        : now,
    currentRepeat: Math.max(1, snapshot.state.currentRepeat),
    durationSeconds,
    elapsedSecondsAtAnchor: clampElapsedSeconds({
      durationSeconds: totalDuration,
      elapsedSeconds:
        snapshot.state.elapsedSecondsAtAnchor ?? snapshot.state.elapsedTime,
    }),
    revision: snapshot.state.revision,
    status: snapshot.state.status,
    totalDuration,
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
              durationSeconds: totalDuration,
              elapsedSeconds:
                pausedStatus === "finished"
                  ? totalDuration
                  : normalizedState.elapsedSecondsAtAnchor,
            }),
      revision: normalizedState.revision,
      status: pausedStatus,
      totalDuration,
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
  command: TimerCommand
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
          totalDuration: resolvedSnapshot.state.totalDuration,
        }),
      }
    case "pause": {
      if (resolvedSnapshot.state.status !== "running") {
        return resolvedSnapshot
      }

      const pausedSnapshot = resolveSessionSnapshotAt(resolvedSnapshot, now)
      const status =
        pausedSnapshot.state.elapsedSecondsAtAnchor >=
        pausedSnapshot.state.totalDuration
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
          totalDuration: pausedSnapshot.state.totalDuration,
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
    case "increase-minute":
    case "decrease-minute": {
      const shouldIncrease = command.type === "increase-minute"
      const currentDuration = resolvedSnapshot.state.totalDuration
      const currentElapsed = resolvedSnapshot.state.elapsedSecondsAtAnchor

      if (resolvedSnapshot.state.status === "idle") {
        const nextDuration = Math.min(
          MAX_TIMER_DURATION_SECONDS,
          Math.max(
            MINUTE_SECONDS,
            currentDuration +
              (shouldIncrease ? MINUTE_SECONDS : -MINUTE_SECONDS),
          ),
        )
        if (nextDuration === currentDuration) {
          return resolvedSnapshot
        }

        const nextParams = updateActiveRow({
          params: resolvedSnapshot.params,
          update: (row) => ({
            ...row,
            totalSeconds: nextDuration,
          }),
        })

        return {
          params: nextParams,
          state: buildStateForActiveRow({
            now,
            revision: nextRevision,
            snapshot: {
              ...resolvedSnapshot,
              params: nextParams,
            },
            status: "idle",
          }),
        }
      }

      if (resolvedSnapshot.state.status === "running") {
        const nextDuration = clampDurationSeconds(
          currentDuration + (shouldIncrease ? MINUTE_SECONDS : -MINUTE_SECONDS),
        )
        const nextElapsedSecondsAtAnchor = clampElapsedSeconds({
          durationSeconds: nextDuration,
          elapsedSeconds: currentElapsed,
        })

        if (
          nextDuration === currentDuration &&
          nextElapsedSecondsAtAnchor === currentElapsed
        ) {
          return resolvedSnapshot
        }

        return {
          params: resolvedSnapshot.params,
          state: buildTimerState({
            anchorServerTimestamp: now,
            currentRepeat: resolvedSnapshot.state.currentRepeat,
            durationSeconds: resolvedSnapshot.state.durationSeconds,
            elapsedSecondsAtAnchor: nextElapsedSecondsAtAnchor,
            revision: nextRevision,
            status: "running",
            totalDuration: nextDuration,
          }),
        }
      }

      if (resolvedSnapshot.state.status === "paused") {
        const nextDuration = clampDurationSeconds(
          currentDuration + (shouldIncrease ? MINUTE_SECONDS : -MINUTE_SECONDS),
        )
        const nextElapsedSecondsAtAnchor = clampElapsedSeconds({
          durationSeconds: nextDuration,
          elapsedSeconds: currentElapsed,
        })

        if (
          nextDuration === currentDuration &&
          nextElapsedSecondsAtAnchor === currentElapsed
        ) {
          return resolvedSnapshot
        }

        return {
          params: resolvedSnapshot.params,
          state: buildTimerState({
            anchorServerTimestamp: now,
            currentRepeat: resolvedSnapshot.state.currentRepeat,
            durationSeconds: resolvedSnapshot.state.durationSeconds,
            elapsedSecondsAtAnchor: nextElapsedSecondsAtAnchor,
            revision: nextRevision,
            status: "paused",
            totalDuration: nextDuration,
          }),
        }
      }

      if (!shouldIncrease) {
        return resolvedSnapshot
      }

      const nextDuration = Math.max(MINUTE_SECONDS, currentDuration)
      const nextParams =
        nextDuration === currentDuration
          ? resolvedSnapshot.params
          : updateActiveRow({
              params: resolvedSnapshot.params,
              update: (row) => ({
                ...row,
                totalSeconds: nextDuration,
              }),
            })

      return {
        params: nextParams,
        state: buildTimerState({
          anchorServerTimestamp: now,
          currentRepeat: resolvedSnapshot.state.currentRepeat,
          durationSeconds: nextDuration,
          elapsedSecondsAtAnchor: Math.max(0, nextDuration - MINUTE_SECONDS),
          revision: nextRevision,
          status: "running",
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
    resolvedCurrentSnapshot.state.totalDuration ===
      resolvedIncomingSnapshot.state.totalDuration &&
    Math.abs(
      resolvedCurrentSnapshot.state.elapsedSecondsAtAnchor -
        resolvedIncomingSnapshot.state.elapsedSecondsAtAnchor,
    ) <= 1
  )
}
