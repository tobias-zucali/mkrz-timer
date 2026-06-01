"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { SyncParams } from "@/shared/liveSession/types"
import { getTimerFinishedSoundOption } from "@/shared/timerSettings"
import { getActiveTimerSequenceRow } from "@/shared/timerSequence"
import { prefixZeros, getMinutesSeconds } from "@/utils/timeInputHelpers"
import useAnimationFrame from "@/utils/useAnimationFrame"
import debug from "@/utils/debug"
import useGlobalKeyUp from "@/utils/useGlobalKeyUp"
import { resolveTimerStateAt, type TimerState } from "@/utils/timerState"

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
  const localParamsRef = useRef(params)
  localParamsRef.current = params
  const paramsRef = syncParamsRef ?? localParamsRef

  const getActiveRowSnapshot = (activeIndex = paramsRef.current.activeIndex) =>
    getSequenceRowAt({
      activeIndex,
      params: paramsRef.current,
    })

  const [elapsedTime, setElapsedTime] = useState<number>(0)
  const [currentRepeat, setCurrentRepeat] = useState(1)
  const [isPaused, setIsPaused] = useState(true)
  const [isStarted, setIsStarted] = useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(0)
  const [revision, setRevision] = useState(0)
  const [totalDuration, setTotalDuration] = useState<number>(
    () => getActiveRowSnapshot().row.totalSeconds,
  )
  const [, setAnimationNow] = useState(() => Date.now())
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
    status: "idle",
    totalDuration,
  })
  const handleActionRef = useRef<(action: TimerActions) => void>(() => {})
  const hasPlayedFinishedSoundRef = useRef(false)
  const finishSoundAudioRef = useRef<HTMLAudioElement | null>(null)
  const previousIsTimedOutRef = useRef(false)

  const resolvedState = resolveTimerStateAt({
    anchorServerTimestamp: lastUpdatedAt,
    currentRepeat,
    durationSeconds: totalDuration,
    elapsedSecondsAtAnchor: elapsedTime,
    elapsedTime,
    isPaused,
    isStarted,
    lastUpdatedAt,
    revision,
    status: !isStarted ? "idle" : isPaused ? "paused" : "running",
    totalDuration,
  })

  const elapsedPercentage =
    resolvedState.totalDuration === 0
      ? 1
      : resolvedState.elapsedTime / resolvedState.totalDuration
  const isTimedOut = elapsedPercentage >= 1

  useEffect(() => {
    const didJustTimeOut = !previousIsTimedOutRef.current && isTimedOut
    previousIsTimedOutRef.current = isTimedOut

    if (!isTimedOut) {
      hasPlayedFinishedSoundRef.current = false
      return
    }

    if (!didJustTimeOut || hasPlayedFinishedSoundRef.current) {
      return
    }

    hasPlayedFinishedSoundRef.current = true
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
  }, [isTimedOut, params.snd])

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

  const createNextState = useCallback(
    (nextState: Omit<TimerState, "revision">): TimerState => ({
      ...nextState,
      revision: latestStateRef.current.revision + 1,
    }),
    [],
  )

  const commitNextState = useCallback(
    (nextState: TimerState) => {
      setCurrentRepeat(nextState.currentRepeat)
      setElapsedTime(nextState.elapsedTime)
      setIsPaused(nextState.isPaused)
      setIsStarted(nextState.isStarted)
      setLastUpdatedAt(nextState.lastUpdatedAt)
      setTotalDuration(nextState.totalDuration)
      setRevision(nextState.revision)
      latestStateRef.current = nextState
      syncStateRef.current = nextState
    },
    [syncStateRef],
  )

  const handleAction = (action: TimerActions) => {
    if (!canMutate) {
      return
    }

    const currentState = latestStateRef.current
    const activeRowSnapshot = getActiveRowSnapshot()

    switch (action) {
      case "start": {
        if (currentState.isStarted && !currentState.isPaused) {
          return
        }

        const nextState = createNextState({
          anchorServerTimestamp: Date.now(),
          currentRepeat: currentState.currentRepeat,
          durationSeconds: activeRowSnapshot.row.totalSeconds,
          elapsedSecondsAtAnchor: currentState.isStarted
            ? currentState.elapsedTime
            : 0,
          elapsedTime: currentState.isStarted ? currentState.elapsedTime : 0,
          isPaused: false,
          isStarted: true,
          lastUpdatedAt: Date.now(),
          status: "running",
          totalDuration: activeRowSnapshot.row.totalSeconds,
        })
        commitNextState(nextState)
        onAction("start", { state: nextState })
        return
      }
      case "pause": {
        if (!currentState.isStarted || currentState.isPaused) {
          return
        }

        const nextState = createNextState({
          anchorServerTimestamp: 0,
          currentRepeat: currentState.currentRepeat,
          durationSeconds: currentState.totalDuration,
          elapsedSecondsAtAnchor: currentState.elapsedTime,
          elapsedTime: currentState.elapsedTime,
          isPaused: true,
          isStarted: true,
          lastUpdatedAt: Date.now(),
          status:
            currentState.elapsedTime >= currentState.totalDuration
              ? "finished"
              : "paused",
          totalDuration: currentState.totalDuration,
        })
        commitNextState(nextState)
        onAction("pause", { state: nextState })
        return
      }
      case "restart": {
        const nextLastUpdatedAt = Date.now()
        const next = {
          params: { activeIndex: activeRowSnapshot.activeIndex },
          state: createNextState({
            anchorServerTimestamp: 0,
            currentRepeat: 1,
            durationSeconds: activeRowSnapshot.row.totalSeconds,
            elapsedSecondsAtAnchor: 0,
            elapsedTime: 0,
            isPaused: true,
            isStarted: false,
            lastUpdatedAt: nextLastUpdatedAt,
            status: "idle",
            totalDuration: activeRowSnapshot.row.totalSeconds,
          }),
        }
        commitNextState(next.state)
        onAction("restart", next)
        return
      }
      case "next":
      case "previous": {
        const direction = action === "next" ? 1 : -1
        const nextIndex = paramsRef.current.activeIndex + direction
        if (nextIndex < 0 || nextIndex >= paramsRef.current.rows.length) {
          return
        }

        const nextRowSnapshot = getActiveRowSnapshot(nextIndex)
        const nextLastUpdatedAt = Date.now()
        const next = {
          params: { activeIndex: nextRowSnapshot.activeIndex },
          state: createNextState({
            anchorServerTimestamp: 0,
            currentRepeat: 1,
            durationSeconds: nextRowSnapshot.row.totalSeconds,
            elapsedSecondsAtAnchor: 0,
            elapsedTime: 0,
            isPaused: true,
            isStarted: false,
            lastUpdatedAt: nextLastUpdatedAt,
            status: "idle",
            totalDuration: nextRowSnapshot.row.totalSeconds,
          }),
        }
        commitNextState(next.state)
        onAction(action, next)
      }
    }
  }

  const activateRow = (activeIndex: number) => {
    if (!canMutate) {
      return
    }

    const nextRowSnapshot = getActiveRowSnapshot(activeIndex)
    const next = {
      params: { activeIndex: nextRowSnapshot.activeIndex },
      state: createNextState({
        anchorServerTimestamp: 0,
        currentRepeat: 1,
        durationSeconds: nextRowSnapshot.row.totalSeconds,
        elapsedSecondsAtAnchor: 0,
        elapsedTime: 0,
        isPaused: true,
        isStarted: false,
        lastUpdatedAt: Date.now(),
        status: "idle",
        totalDuration: nextRowSnapshot.row.totalSeconds,
      }),
    }
    commitNextState(next.state)
    onAction("activate", next)
  }

  handleActionRef.current = handleAction

  useEffect(() => {
    const currentResolvedState = resolvedState
    const activeRowSnapshot = getSequenceRowAt({
      activeIndex: paramsRef.current.activeIndex,
      params: paramsRef.current,
    })

    if (
      sequenceAuthority !== "client" ||
      !currentResolvedState.isStarted ||
      currentResolvedState.isPaused ||
      currentResolvedState.elapsedTime < currentResolvedState.totalDuration
    ) {
      return
    }

    const currentRow = activeRowSnapshot.row
    if (currentResolvedState.currentRepeat < currentRow.repeatCount) {
      const nextState = createNextState({
        anchorServerTimestamp: Date.now(),
        currentRepeat: currentResolvedState.currentRepeat + 1,
        durationSeconds: currentRow.totalSeconds,
        elapsedSecondsAtAnchor: 0,
        elapsedTime: 0,
        isPaused: false,
        isStarted: true,
        lastUpdatedAt: Date.now(),
        status: "running",
        totalDuration: currentRow.totalSeconds,
      })
      commitNextState(nextState)
      onAction("start", { state: nextState })
      return
    }

    if (currentRow.endBehavior === "advance") {
      const nextIndex =
        paramsRef.current.rows.length <= 1
          ? activeRowSnapshot.activeIndex
          : (activeRowSnapshot.activeIndex + 1) % paramsRef.current.rows.length
      const nextRowSnapshot = getSequenceRowAt({
        activeIndex: nextIndex,
        params: paramsRef.current,
      })
      const next = {
        params: { activeIndex: nextRowSnapshot.activeIndex },
        state: createNextState({
          anchorServerTimestamp: Date.now(),
          currentRepeat: 1,
          durationSeconds: nextRowSnapshot.row.totalSeconds,
          elapsedSecondsAtAnchor: 0,
          elapsedTime: 0,
          isPaused: false,
          isStarted: true,
          lastUpdatedAt: Date.now(),
          status: "running",
          totalDuration: nextRowSnapshot.row.totalSeconds,
        }),
      }
      commitNextState(next.state)
      onAction("start", next)
      return
    }

    const nextState = createNextState({
      anchorServerTimestamp: 0,
      currentRepeat: currentResolvedState.currentRepeat,
      durationSeconds: currentResolvedState.totalDuration,
      elapsedSecondsAtAnchor: currentResolvedState.totalDuration,
      elapsedTime: currentResolvedState.totalDuration,
      isPaused: true,
      isStarted: true,
      lastUpdatedAt: Date.now(),
      status: "finished",
      totalDuration: currentResolvedState.totalDuration,
    })
    commitNextState(nextState)
    onAction("pause", { state: nextState })
  }, [
    commitNextState,
    createNextState,
    onAction,
    paramsRef,
    resolvedState,
    sequenceAuthority,
  ])

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
