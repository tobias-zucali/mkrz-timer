"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import {
  applyTimerCommandToSnapshot,
  resolveSessionSnapshotAt,
} from "@/shared/timerState"
import type { SyncParams } from "@/shared/liveSession/types"
import { getTimerFinishedSoundOption } from "@/shared/timerSettings"
import { getActiveTimerSequenceRow } from "@/shared/timerSequence"
import { prefixZeros, getMinutesSeconds } from "@/utils/timeInputHelpers"
import useAnimationFrame from "@/utils/useAnimationFrame"
import debug from "@/utils/debug"
import useGlobalKeyUp from "@/utils/useGlobalKeyUp"
import type { TimerState } from "@/utils/timerState"

export type TimerActions =
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

const getSequenceRowAt = ({
  activeIndex,
  params,
}: {
  activeIndex: number
  params: SyncParams
}) => getActiveTimerSequenceRow({ activeIndex, rows: params.rows })

const isSpaceKey = (key: string) =>
  key === " " || key === "Space" || key === "Spacebar"

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

  const [activeIndex, setActiveIndex] = useState(() => params.activeIndex)
  const buildEffectiveParams = () => ({
    ...params,
    activeIndex,
  })
  const effectiveParams = buildEffectiveParams()

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
  const [totalDuration, setTotalDuration] = useState<number>(
    () => getActiveRowSnapshot().row.totalSeconds,
  )
  const [animationNow, setAnimationNow] = useState(() => Date.now())
  const latestStateRef = useRef<TimerState>({
    anchorServerTimestamp: 0,
    currentRepeat,
    durationSeconds: totalDuration,
    elapsedSecondsAtAnchor: elapsedTime,
    elapsedTime,
    isPaused,
    revision,
    isStarted,
    lastUpdatedAt,
    status,
    totalDuration,
  })
  const handleActionRef = useRef<(action: TimerActions) => void>(() => {})
  const finishSoundAudioRef = useRef<HTMLAudioElement | null>(null)
  const previousIsTimedOutRef = useRef(false)
  const previousCompletedStepKeyRef = useRef<string | null>(null)
  const rawState: TimerState = {
    anchorServerTimestamp: lastUpdatedAt,
    currentRepeat,
    durationSeconds: totalDuration,
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
  const isTimedOut = elapsedPercentage >= 1
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
    const didJustTimeOut = !previousIsTimedOutRef.current && isTimedOut
    previousIsTimedOutRef.current = isTimedOut

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
  }, [completedStepKey, isTimedOut, params.snd])

  useEffect(() => {
    return () => {
      finishSoundAudioRef.current?.pause()
      finishSoundAudioRef.current = null
    }
  }, [])

  const [minutes = prefixZeros(params.m), seconds = prefixZeros(params.s)] =
    isStarted
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
      setTotalDuration(nextState.totalDuration)
      setRevision(nextState.revision)
      latestStateRef.current = nextState
      syncStateRef.current = nextState
    },
    [syncStateRef],
  )

  const commitSnapshot = useCallback(
    (nextSnapshot: { params: SyncParams; state: TimerState }) => {
      setActiveIndex(nextSnapshot.params.activeIndex)
      commitNextState(nextSnapshot.state)
    },
    [commitNextState],
  )

  const buildActionPayload = useCallback(
    ({
      currentActiveIndex,
      nextSnapshot,
    }: {
      currentActiveIndex: number
      nextSnapshot: { params: SyncParams; state: TimerState }
    }) => ({
      params:
        nextSnapshot.params.activeIndex !== currentActiveIndex
          ? { activeIndex: nextSnapshot.params.activeIndex }
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
    const now = Date.now()
    const nextSnapshot = applyTimerCommandToSnapshot({
      command:
        action === "restart"
          ? { type: "reset" }
          : action === "activate"
            ? {
                activeIndex: currentActiveIndex,
                type: "activate",
              }
            : { type: action },
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
        nextSnapshot,
      }),
    )
  }

  handleActionRef.current = handleAction

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
        nextSnapshot: resolvedSnapshot,
      }),
    )
  }, [
    buildActionPayload,
    commitSnapshot,
    onAction,
    activeIndex,
    resolvedSnapshot,
    resolvedState,
    sequenceAuthority,
  ])

  useEffect(() => {
    const nextActiveIndex = getSequenceRowAt({
      activeIndex: params.activeIndex,
      params,
    }).activeIndex

    setActiveIndex((current) =>
      current === nextActiveIndex ? current : nextActiveIndex,
    )
  }, [params, params.activeIndex])

  useGlobalKeyUp((event: KeyboardEvent) => {
    if (!shortcutsEnabled) {
      return
    }

    const timerWindow =
      typeof window === "undefined"
        ? null
        : (window as typeof window & {
            __timerSpaceShortcutConsumed?: boolean
          })

    if (isSpaceKey(event.key) && timerWindow?.__timerSpaceShortcutConsumed) {
      timerWindow.__timerSpaceShortcutConsumed = false
      return
    }

    const target = event.target
    const targetIsTimerShortcutButton =
      target instanceof HTMLElement &&
      target.dataset.timerSpaceShortcut === "true"

    if (
      target instanceof HTMLElement &&
      target.tagName === "BUTTON" &&
      (event.key === "Enter" || isSpaceKey(event.key))
    ) {
      if (targetIsTimerShortcutButton) {
        handleAction(isTimedOut ? "restart" : isPaused ? "start" : "pause")
      }

      return
    }
    switch (event.key) {
      case "r":
      case "Escape":
        handleAction("restart")
        break
      case "ArrowLeft":
        handleAction("previous")
        break
      case "ArrowRight":
        handleAction("next")
        break
      case "Enter":
      case " ":
      case "Space":
      case "Spacebar":
        handleAction(isTimedOut ? "restart" : isPaused ? "start" : "pause")
        break
      case "p":
        if (!isTimedOut) {
          handleAction(isPaused ? "start" : "pause")
        }
        break
    }
  })

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const handleTimerSpaceShortcut = () => {
      if (!shortcutsEnabled) {
        return
      }

      handleActionRef.current(
        isTimedOut ? "restart" : isPaused ? "start" : "pause",
      )
    }

    window.addEventListener("timer-space-shortcut", handleTimerSpaceShortcut)
    return () => {
      window.removeEventListener(
        "timer-space-shortcut",
        handleTimerSpaceShortcut,
      )
    }
  }, [isPaused, isTimedOut, shortcutsEnabled])

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
    isPaused,
    isStarted,
    isTimedOut,
    minutes,
    seconds,
    setState,
    totalDuration,
  }
}
