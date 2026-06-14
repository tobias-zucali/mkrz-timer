"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import {
  applyTimerCommandToSnapshot,
  resolveSessionSnapshotAt,
} from "@/shared/timerState"
import type { SyncParams } from "@/shared/liveSession/types"
import { getTimerFinishedSoundOption } from "@/shared/timerSettings"
import { getActiveTimerSequenceRow } from "@/shared/timerSequence"
import { getTimerShortcutIntent } from "@/utils/timerShortcuts"
import { prefixZeros, getMinutesSeconds } from "@/utils/timeInputHelpers"
import useAnimationFrame from "@/utils/useAnimationFrame"
import debug from "@/utils/debug"
import useGlobalKeyEvent from "@/utils/useGlobalKeyEvent"
import type { TimerState } from "@/utils/timerState"

export type TimerActions =
  | "decrease-minute"
  | "increase-minute"
  | "activate"
  | "next"
  | "pause"
  | "previous"
  | "restart"
  | "start"

export type { TimerState }

type TimerActionPayload = {
  params?: Partial<SyncParams>
  state: TimerState
}

const getCommandForAction = ({
  action,
  currentActiveIndex,
}: {
  action: TimerActions
  currentActiveIndex: number
}) => {
  switch (action) {
    case "restart":
      return { type: "reset" } as const
    case "increase-minute":
      return { type: "increase-minute" } as const
    case "decrease-minute":
      return { type: "decrease-minute" } as const
    case "activate":
      return {
        activeIndex: currentActiveIndex,
        type: "activate",
      } as const
    default:
      return { type: action } as const
  }
}

const getSequenceRowAt = ({
  activeIndex,
  params,
}: {
  activeIndex: number
  params: SyncParams
}) => getActiveTimerSequenceRow({ activeIndex, rows: params.rows })

export default function useTimer({
  canMutate = true,
  onAction,
  params,
  sequenceAuthority = "client",
  syncParamsRef,
  syncStateRef,
  shortcutsEnabled = true,
}: {
  canMutate?: boolean
  params: SyncParams
  sequenceAuthority?: "client" | "server"
  syncParamsRef?: React.RefObject<SyncParams>
  syncStateRef: React.RefObject<TimerState>
  onAction: (action: TimerActions, payload: TimerActionPayload) => void
  shortcutsEnabled?: boolean
}) {
  void syncParamsRef

  const [localParams, setLocalParams] = useState(() => ({
    activeIndex: params.activeIndex,
    m: params.m,
    pc: params.pc,
    rows: params.rows,
    s: params.s,
    title: params.title,
  }))
  const buildEffectiveParams = () => ({
    ...params,
    ...localParams,
  })
  const effectiveParams = buildEffectiveParams()
  const activeIndex = effectiveParams.activeIndex

  const getActiveRowSnapshot = (
    nextActiveIndex = effectiveParams.activeIndex,
  ) =>
    getSequenceRowAt({
      activeIndex: nextActiveIndex,
      params: effectiveParams,
    })

  const [elapsedTime, setElapsedTime] = useState<number>(0)
  const [currentRepeat, setCurrentRepeat] = useState(1)
  const [isPaused, setIsPaused] = useState(true)
  const [isStarted, setIsStarted] = useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(0)
  const [revision, setRevision] = useState(0)
  const [status, setStatus] = useState<TimerState["status"]>("idle")
  const [durationSeconds, setDurationSeconds] = useState<number>(
    () => getActiveRowSnapshot().row.totalSeconds,
  )
  const [totalDuration, setTotalDuration] = useState<number>(
    () => getActiveRowSnapshot().row.totalSeconds,
  )
  const [animationNow, setAnimationNow] = useState(() => Date.now())
  const latestStateRef = useRef<TimerState>({
    anchorServerTimestamp: 0,
    currentRepeat,
    durationSeconds,
    elapsedSecondsAtAnchor: elapsedTime,
    elapsedTime,
    isPaused,
    revision,
    isStarted,
    lastUpdatedAt,
    status,
    totalDuration,
  })
  const finishSoundAudioRef = useRef<HTMLAudioElement | null>(null)
  const previousIsTimedOutRef = useRef(false)
  const previousCompletedStepKeyRef = useRef<string | null>(null)
  const rawState: TimerState = {
    anchorServerTimestamp: lastUpdatedAt,
    currentRepeat,
    durationSeconds,
    elapsedSecondsAtAnchor: elapsedTime,
    elapsedTime,
    isPaused,
    isStarted,
    lastUpdatedAt,
    revision,
    status,
    totalDuration,
  }
  const resolvedSnapshot = resolveSessionSnapshotAt({
    params: effectiveParams,
    state: rawState,
  })
  const resolvedState = resolvedSnapshot.state

  const elapsedPercentage =
    resolvedState.totalDuration === 0
      ? 1
      : resolvedState.elapsedTime / resolvedState.totalDuration
  const isFinished = resolvedState.status === "finished"
  const isStartDisabled =
    (resolvedState.status === "idle" || resolvedState.status === "paused") &&
    resolvedState.totalDuration === 0
  const rawElapsedTime =
    rawState.status === "running" && rawState.anchorServerTimestamp > 0
      ? rawState.elapsedSecondsAtAnchor +
        Math.max(0, animationNow - rawState.anchorServerTimestamp) / 1000
      : rawState.elapsedTime
  const hasCompletedCurrentStep =
    rawState.status === "running" &&
    rawState.totalDuration > 0 &&
    rawElapsedTime >= rawState.totalDuration
  const completedStepKey = hasCompletedCurrentStep
    ? `${activeIndex}:${rawState.currentRepeat}:${rawState.revision}`
    : null

  useEffect(() => {
    const didJustTimeOut = !previousIsTimedOutRef.current && isFinished
    previousIsTimedOutRef.current = isFinished

    const didCompleteNewStep =
      completedStepKey !== null &&
      completedStepKey !== previousCompletedStepKeyRef.current
    previousCompletedStepKeyRef.current = completedStepKey

    if (!didJustTimeOut && !didCompleteNewStep) {
      return
    }

    const sound = getTimerFinishedSoundOption(params.snd)
    if (!sound.src) {
      return
    }

    finishSoundAudioRef.current?.pause()
    finishSoundAudioRef.current = new Audio(sound.src)
    finishSoundAudioRef.current.currentTime = 0
    void finishSoundAudioRef.current.play().catch((error) => {
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        debug.warn("Autoplay prevented")
        return
      }
    })
  }, [completedStepKey, isFinished, params.snd])

  useEffect(() => {
    return () => {
      finishSoundAudioRef.current?.pause()
      finishSoundAudioRef.current = null
    }
  }, [])

  const [
    minutes = prefixZeros(effectiveParams.m),
    seconds = prefixZeros(effectiveParams.s),
  ] = isStarted
    ? getMinutesSeconds(totalDuration * (1 - elapsedPercentage), 10)
    : []

  useAnimationFrame(
    () => {
      setAnimationNow(Date.now())
    },
    { isPaused: !isStarted || isPaused },
  )

  const commitNextState = useCallback(
    (nextState: TimerState) => {
      setCurrentRepeat(nextState.currentRepeat)
      setElapsedTime(nextState.elapsedTime)
      setIsPaused(nextState.isPaused)
      setIsStarted(nextState.isStarted)
      setLastUpdatedAt(nextState.lastUpdatedAt)
      setStatus(nextState.status)
      setDurationSeconds(nextState.durationSeconds)
      setTotalDuration(nextState.totalDuration)
      setRevision(nextState.revision)
      latestStateRef.current = nextState
      syncStateRef.current = nextState
    },
    [syncStateRef],
  )

  const commitSnapshot = useCallback(
    (nextSnapshot: { params: SyncParams; state: TimerState }) => {
      setLocalParams({
        activeIndex: nextSnapshot.params.activeIndex,
        m: nextSnapshot.params.m,
        pc: nextSnapshot.params.pc,
        rows: nextSnapshot.params.rows,
        s: nextSnapshot.params.s,
        title: nextSnapshot.params.title,
      })
      commitNextState(nextSnapshot.state)
    },
    [commitNextState],
  )

  const buildActionPayload = useCallback(
    ({
      currentActiveIndex,
      currentRows,
      nextSnapshot,
    }: {
      currentActiveIndex: number
      currentRows: SyncParams["rows"]
      nextSnapshot: { params: SyncParams; state: TimerState }
    }) => ({
      params:
        nextSnapshot.params.activeIndex !== currentActiveIndex ||
        JSON.stringify(nextSnapshot.params.rows) !== JSON.stringify(currentRows)
          ? {
              ...(nextSnapshot.params.activeIndex !== currentActiveIndex
                ? { activeIndex: nextSnapshot.params.activeIndex }
                : {}),
              ...(JSON.stringify(nextSnapshot.params.rows) !==
              JSON.stringify(currentRows)
                ? { rows: nextSnapshot.params.rows }
                : {}),
            }
          : undefined,
      state: nextSnapshot.state,
    }),
    [],
  )

  const runAction = (action: TimerActions) => {
    if (!canMutate) {
      return
    }

    const currentSnapshot = {
      params: buildEffectiveParams(),
      state: latestStateRef.current,
    }
    const currentActiveIndex = currentSnapshot.params.activeIndex
    const currentRows = currentSnapshot.params.rows
    const now = Date.now()
    const nextSnapshot = applyTimerCommandToSnapshot({
      command: getCommandForAction({
        action,
        currentActiveIndex,
      }),
      now,
      snapshot: currentSnapshot,
    })

    if (
      nextSnapshot.params.activeIndex === currentActiveIndex &&
      nextSnapshot.state.revision === currentSnapshot.state.revision &&
      nextSnapshot.state.status === currentSnapshot.state.status
    ) {
      return
    }

    commitSnapshot(nextSnapshot)
    onAction(
      action,
      buildActionPayload({
        currentActiveIndex,
        currentRows,
        nextSnapshot,
      }),
    )
  }

  const handleAction = (action: TimerActions) => {
    runAction(action)
  }

  const activateRow = (activeIndex: number) => {
    if (!canMutate) {
      return
    }

    const currentSnapshot = {
      params: buildEffectiveParams(),
      state: latestStateRef.current,
    }
    const currentActiveIndex = currentSnapshot.params.activeIndex
    const currentRows = currentSnapshot.params.rows
    const nextSnapshot = applyTimerCommandToSnapshot({
      command: {
        activeIndex,
        type: "activate",
      },
      now: Date.now(),
      snapshot: currentSnapshot,
    })

    commitSnapshot(nextSnapshot)
    onAction(
      "activate",
      buildActionPayload({
        currentActiveIndex,
        currentRows,
        nextSnapshot,
      }),
    )
  }
  useEffect(() => {
    if (
      sequenceAuthority !== "client" ||
      (resolvedSnapshot.params.activeIndex === activeIndex &&
        resolvedState.revision === latestStateRef.current.revision &&
        resolvedState.status === latestStateRef.current.status &&
        resolvedState.currentRepeat === latestStateRef.current.currentRepeat)
    ) {
      return
    }

    const currentActiveIndex = activeIndex
    commitSnapshot(resolvedSnapshot)
    onAction(
      resolvedState.status === "running" ? "start" : "pause",
      buildActionPayload({
        currentActiveIndex,
        currentRows: effectiveParams.rows,
        nextSnapshot: resolvedSnapshot,
      }),
    )
  }, [
    effectiveParams.rows,
    buildActionPayload,
    commitSnapshot,
    onAction,
    activeIndex,
    resolvedSnapshot,
    resolvedState,
    sequenceAuthority,
  ])

  useEffect(() => {
    setLocalParams((current) => {
      const nextActiveIndex = getSequenceRowAt({
        activeIndex: params.activeIndex,
        params,
      }).activeIndex
      const rowsChanged =
        JSON.stringify(current.rows) !== JSON.stringify(params.rows)

      if (
        current.activeIndex === nextActiveIndex &&
        current.m === params.m &&
        current.pc === params.pc &&
        current.s === params.s &&
        current.title === params.title &&
        !rowsChanged
      ) {
        return current
      }

      return {
        activeIndex: nextActiveIndex,
        m: params.m,
        pc: params.pc,
        rows: params.rows,
        s: params.s,
        title: params.title,
      }
    })
  }, [params])

  useGlobalKeyEvent("keydown", (event: KeyboardEvent) => {
    if (!shortcutsEnabled) {
      return
    }

    const intent = getTimerShortcutIntent(event)
    if (intent === null) {
      return
    }

    switch (intent) {
      case "decrease-minute":
        handleAction("decrease-minute")
        return
      case "increase-minute":
        handleAction("increase-minute")
        return
      case "next":
        handleAction("next")
        return
      case "pause":
        if (!isFinished) {
          handleAction(isPaused ? "start" : "pause")
        }
        return
      case "previous":
        handleAction("previous")
        return
      case "reset":
        handleAction("restart")
        return
      case "toggle":
        handleAction(isFinished ? "restart" : isPaused ? "start" : "pause")
        return
    }
  })

  const setState = useCallback(
    ({
      anchorServerTimestamp,
      currentRepeat,
      durationSeconds,
      elapsedSecondsAtAnchor,
      elapsedTime,
      isPaused,
      revision,
      isStarted,
      lastUpdatedAt,
      status,
      totalDuration,
    }: TimerState) => {
      setRevision(() => revision)
      setCurrentRepeat(() => currentRepeat)
      latestStateRef.current = {
        anchorServerTimestamp,
        currentRepeat,
        durationSeconds,
        elapsedSecondsAtAnchor,
        elapsedTime,
        isPaused,
        isStarted,
        lastUpdatedAt,
        revision,
        status,
        totalDuration,
      }
      syncStateRef.current = latestStateRef.current
      setElapsedTime(() => elapsedTime)
      setIsPaused(() => isPaused)
      setIsStarted(() => isStarted)
      setLastUpdatedAt(() => lastUpdatedAt)
      setStatus(() => status)
      setDurationSeconds(() => durationSeconds)
      setTotalDuration(() => totalDuration)
    },
    [syncStateRef],
  )

  latestStateRef.current = {
    ...resolvedState,
    revision,
  }
  syncStateRef.current = latestStateRef.current

  return {
    activateRow,
    currentRepeat,
    elapsedPercentage,
    handleAction,
    isFinished,
    isPaused,
    isStartDisabled,
    isStarted,
    minutes,
    seconds,
    setState,
    totalDuration,
  }
}
