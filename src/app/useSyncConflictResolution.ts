"use client"

import { useCallback, useState } from "react"

import type { SyncParams } from "@/shared/remoteSession/types"
import {
  projectFirstUrlTimerRowToSyncParams,
  syncParamsMatchParsedTimerUrlState,
} from "@/shared/urlState"
import { getSecondsDuration } from "@/utils/timeInputHelpers"
import type { TimerState } from "@/utils/useTimer"
import type useParams from "@/utils/useParams"

export default function useSyncConflictResolution({
  paramData,
  remoteRole,
  syncParamsRef,
  syncStateRef,
}: {
  paramData: ReturnType<typeof useParams>
  remoteRole: "control" | "readonly" | null
  syncParamsRef: React.RefObject<SyncParams>
  syncStateRef: React.RefObject<TimerState>
}) {
  const [hasSyncConflict, setHasSyncConflict] = useState(false)

  const buildCurrentUrlSnapshot = useCallback(
    (applyToLocalState = false) => {
      const currentTimerUrlState = paramData.readTimerUrlState()
      const projectedParams = projectFirstUrlTimerRowToSyncParams({
        fallback: syncParamsRef.current,
        state: currentTimerUrlState,
      })

      if (applyToLocalState && currentTimerUrlState.hasTimerState) {
        paramData.setParams(projectedParams)
      }

      return {
        hasTimerState: currentTimerUrlState.hasTimerState,
        params: projectedParams,
        state: {
          ...syncStateRef.current,
          totalDuration: getSecondsDuration(
            projectedParams.m,
            projectedParams.s,
          ),
        },
        urlState: currentTimerUrlState,
      }
    },
    [paramData, syncParamsRef, syncStateRef],
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

      return !syncParamsMatchParsedTimerUrlState({
        params: snapshot.params,
        state: currentUrlSnapshot.urlState,
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
    clearSyncConflict()
  }, [buildCurrentUrlSnapshot, clearSyncConflict, syncParamsRef])

  return {
    applyUrlSyncState,
    clearSyncConflict,
    getReconnectSnapshot,
    hasSyncConflict,
    notifyIncomingSyncConflict,
    shouldDeferIncomingSnapshot,
  }
}
