import type { SessionSnapshot } from "@/shared/remoteSession/types"

export type TimerState = SessionSnapshot["state"]

const clampElapsedTime = ({
  elapsedTime,
  totalDuration,
}: {
  elapsedTime: number
  totalDuration: number
}) => {
  if (elapsedTime < 0) {
    return 0
  }

  if (elapsedTime > totalDuration) {
    return totalDuration
  }

  return elapsedTime
}

export const resolveTimerStateAt = (
  state: TimerState,
  now = Date.now(),
): TimerState => {
  const resolvedElapsedTime = clampElapsedTime({
    elapsedTime:
      state.isStarted && !state.isPaused && state.lastUpdatedAt > 0
        ? state.elapsedTime + Math.max(0, now - state.lastUpdatedAt) / 1000
        : state.elapsedTime,
    totalDuration: state.totalDuration,
  })

  return {
    ...state,
    elapsedTime: resolvedElapsedTime,
  }
}

export const stampTimerStateAt = (
  state: TimerState,
  now = Date.now(),
): TimerState => {
  const resolvedState = resolveTimerStateAt(state, now)

  return {
    ...resolvedState,
    lastUpdatedAt: now,
  }
}

export const resolveSessionSnapshotAt = (
  snapshot: SessionSnapshot,
  now = Date.now(),
): SessionSnapshot => ({
  ...snapshot,
  state: resolveTimerStateAt(snapshot.state, now),
})

export const stampSessionSnapshotAt = (
  snapshot: SessionSnapshot,
  now = Date.now(),
): SessionSnapshot => ({
  ...snapshot,
  state: stampTimerStateAt(snapshot.state, now),
})

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
    resolvedCurrentSnapshot.state.isPaused ===
      resolvedIncomingSnapshot.state.isPaused &&
    resolvedCurrentSnapshot.state.isStarted ===
      resolvedIncomingSnapshot.state.isStarted &&
    resolvedCurrentSnapshot.state.totalDuration ===
      resolvedIncomingSnapshot.state.totalDuration &&
    Math.abs(
      resolvedCurrentSnapshot.state.elapsedTime -
        resolvedIncomingSnapshot.state.elapsedTime,
    ) <= 1
  )
}
