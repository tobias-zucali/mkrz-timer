"use client"

import { useCallback, useRef, useState } from "react"

import type { SessionSnapshot, SyncParams } from "@/shared/remoteSession/types"
import { projectFirstUrlTimerRowToSyncParams } from "@/shared/urlState"
import { getSecondsDuration } from "@/utils/timeInputHelpers"
import type { TimerState } from "@/utils/useTimer"
import type useParams from "@/utils/useParams"

const snapshotsConflict = ({
  currentSnapshot,
  incomingSnapshot,
}: {
  currentSnapshot: SessionSnapshot
  incomingSnapshot: SessionSnapshot
}) =>
  currentSnapshot.params.m !== incomingSnapshot.params.m ||
  currentSnapshot.params.s !== incomingSnapshot.params.s ||
  currentSnapshot.params.title !== incomingSnapshot.params.title ||
  currentSnapshot.params.bg !== incomingSnapshot.params.bg ||
  currentSnapshot.params.fg !== incomingSnapshot.params.fg ||
  currentSnapshot.params.pc !== incomingSnapshot.params.pc ||
  currentSnapshot.state.isPaused !== incomingSnapshot.state.isPaused ||
  currentSnapshot.state.isStarted !== incomingSnapshot.state.isStarted ||
  currentSnapshot.state.totalDuration !==
    incomingSnapshot.state.totalDuration ||
  Math.abs(
    currentSnapshot.state.elapsedTime - incomingSnapshot.state.elapsedTime,
  ) > 1

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

  const buildCurrentUrlSnapshot = useCallback(
    (applyToLocalState = false) => {
      const currentTimerUrlState = paramData.readTimerUrlState()
      const effectiveTimerUrlState = currentTimerUrlState.hasTimerState
        ? currentTimerUrlState
        : initialUrlTimerStateRef.current
      const projectedParams = projectFirstUrlTimerRowToSyncParams({
        fallback: syncParamsRef.current,
        state: effectiveTimerUrlState,
      })
      const snapshot = {
        params: projectedParams,
        state: {
          ...syncStateRef.current,
          totalDuration: getSecondsDuration(
            projectedParams.m,
            projectedParams.s,
          ),
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

  const shouldDeferIncomingSnapshot = useCallback(
    ({ snapshot }: { snapshot: { params: SyncParams; state: TimerState } }) => {
      if (remoteRole !== "control") {
        return false
      }

      const currentUrlSnapshot = buildCurrentUrlSnapshot(false)
      if (!currentUrlSnapshot.hasTimerState) {
        return false
      }

      return snapshotsConflict({
        currentSnapshot: {
          params: currentUrlSnapshot.params,
          state: currentUrlSnapshot.state,
        },
        incomingSnapshot: {
          params: snapshot.params,
          state: snapshot.state,
        },
      })
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
    shouldDeferIncomingSnapshot,
  }
}
