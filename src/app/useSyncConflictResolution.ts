"use client"

import { useCallback, useRef, useState } from "react"

import type { SessionSnapshot, SyncParams } from "@/shared/remoteSession/types"
import { projectTimerUrlStateToSyncParams } from "@/shared/urlState"
import { decideSnapshotRecovery } from "@/utils/remoteSession/recovery"
import { stampSessionSnapshotAt } from "@/utils/timerState"
import type { TimerState } from "@/utils/useTimer"
import type useParams from "@/utils/useParams"

export default function useSyncConflictResolution({
  applyLocalSnapshot,
  paramData,
  remoteRole,
  syncParamsRef,
  syncStateRef,
}: {
  applyLocalSnapshot: (snapshot: SessionSnapshot) => void
  paramData: ReturnType<typeof useParams>
  remoteRole: "control" | "readonly" | null
  syncParamsRef: React.RefObject<SyncParams>
  syncStateRef: React.RefObject<TimerState>
}) {
  const [hasSyncConflict, setHasSyncConflict] = useState(false)
  const initialUrlTimerStateRef = useRef(paramData.readTimerUrlState())
  const initialLocalSnapshotRef = useRef(
    stampSessionSnapshotAt({
      params: syncParamsRef.current,
      state: syncStateRef.current,
    }),
  )

  const buildCurrentUrlSnapshot = useCallback(
    (applyToLocalState = false) => {
      const currentTimerUrlState = paramData.readTimerUrlState()
      const effectiveTimerUrlState = currentTimerUrlState.hasTimerState
        ? currentTimerUrlState
        : initialUrlTimerStateRef.current
      const projectedParams = projectTimerUrlStateToSyncParams({
        fallback: syncParamsRef.current,
        state: effectiveTimerUrlState,
      })
      const snapshot = {
        params: projectedParams,
        state: {
          ...syncStateRef.current,
          anchorServerTimestamp: 0,
          currentRepeat: 1,
          durationSeconds:
            projectedParams.rows[projectedParams.activeIndex]?.totalSeconds ??
            syncStateRef.current.totalDuration,
          elapsedSecondsAtAnchor: syncStateRef.current.elapsedTime,
          totalDuration:
            projectedParams.rows[projectedParams.activeIndex]?.totalSeconds ??
            syncStateRef.current.totalDuration,
          status: syncStateRef.current.isStarted
            ? syncStateRef.current.isPaused
              ? "paused"
              : "running"
            : "idle",
        },
      } satisfies SessionSnapshot

      if (applyToLocalState && effectiveTimerUrlState.hasTimerState) {
        syncParamsRef.current = snapshot.params
        syncStateRef.current = snapshot.state
        applyLocalSnapshot(snapshot)
      }

      return {
        hasTimerState: effectiveTimerUrlState.hasTimerState,
        ...snapshot,
        urlState: effectiveTimerUrlState,
      }
    },
    [applyLocalSnapshot, paramData, syncParamsRef, syncStateRef],
  )

  const notifyIncomingSyncConflict = useCallback(() => {
    setHasSyncConflict(true)
  }, [])

  const resolveIncomingSnapshot = useCallback(
    ({ snapshot }: { snapshot: { params: SyncParams; state: TimerState } }) => {
      if (remoteRole !== "control") {
        return {
          resolution: "accept-server" as const,
        }
      }

      const currentUrlSnapshot = buildCurrentUrlSnapshot(false)
      if (!currentUrlSnapshot.hasTimerState) {
        return {
          resolution: "accept-server" as const,
        }
      }

      const localSnapshot = {
        params: currentUrlSnapshot.params,
        state: currentUrlSnapshot.state,
      } satisfies SessionSnapshot
      const { resolution } = decideSnapshotRecovery({
        baselineSnapshot: initialLocalSnapshotRef.current,
        localSnapshot,
        serverSnapshot: snapshot,
      })

      return {
        localSnapshot,
        resolution,
      }
    },
    [buildCurrentUrlSnapshot, remoteRole],
  )

  const getReconnectSnapshot = useCallback(() => {
    const snapshot = buildCurrentUrlSnapshot(true)
    return {
      params: snapshot.params,
      state: snapshot.state,
    }
  }, [buildCurrentUrlSnapshot])

  const clearSyncConflict = useCallback(() => {
    setHasSyncConflict(false)
  }, [])

  const applyUrlSyncState = useCallback(() => {
    const currentUrlSnapshot = buildCurrentUrlSnapshot(true)
    syncParamsRef.current = currentUrlSnapshot.params
    syncStateRef.current = currentUrlSnapshot.state
    clearSyncConflict()
  }, [buildCurrentUrlSnapshot, clearSyncConflict, syncParamsRef, syncStateRef])

  return {
    applyUrlSyncState,
    clearSyncConflict,
    getReconnectSnapshot,
    hasSyncConflict,
    notifyIncomingSyncConflict,
    resolveIncomingSnapshot,
  }
}
