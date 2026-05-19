"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  prefixZeros,
  getSecondsDuration,
  getMinutesSeconds,
} from "@/utils/timeInputHelpers"
import type { SyncParams } from "@/shared/remoteSession/types"
import useAnimationFrame from "@/utils/useAnimationFrame"
import useGlobalKeyUp from "@/utils/useGlobalKeyUp"
import debug from "@/utils/debug"
import { resolveTimerStateAt, type TimerState } from "@/utils/timerState"

export type TimerActions = "pause" | "reset" | "start"
export type { TimerState }

export default function useTimer({
  canMutate = true,
  onAction,
  syncStateRef,
  params,
  shortcutsEnabled = true,
}: {
  canMutate?: boolean
  params: SyncParams
  syncStateRef: React.RefObject<TimerState>
  onAction: (action: TimerActions, state: TimerState) => void
  shortcutsEnabled?: boolean
}) {
  const paramsRef = useRef(params)
  paramsRef.current = params

  const getTotalDuration = useCallback(
    () => getSecondsDuration(paramsRef.current.m, paramsRef.current.s),
    [],
  )

  const [elapsedTime, setElapsedTime] = useState<number>(0)
  const [isPaused, setIsPaused] = useState(true)
  const [isStarted, setIsStarted] = useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(0)
  const [revision, setRevision] = useState(0)
  const [totalDuration, setTotalDuration] = useState<number>(getTotalDuration)
  const [, setAnimationNow] = useState(() => Date.now())
  const latestStateRef = useRef<TimerState>({
    elapsedTime,
    isPaused,
    revision,
    isStarted,
    lastUpdatedAt,
    totalDuration,
  })

  const resolvedState = resolveTimerStateAt({
    elapsedTime,
    isPaused,
    isStarted,
    lastUpdatedAt,
    revision,
    totalDuration,
  })

  const elapsedPercentage = resolvedState.elapsedTime / totalDuration
  const isTimedOut = elapsedPercentage >= 1

  useEffect(() => {
    if (isTimedOut) {
      new Audio("/sounds/Attention.mp3").play().catch((error) => {
        if (error instanceof DOMException && error.name === "NotAllowedError") {
          debug.warn("Autoplay prevented")
          return
        }
      })
    }
  }, [isTimedOut])

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

  const handleAction = useCallback(
    (action: TimerActions) => {
      if (!canMutate) {
        return
      }

      const startTimer = () => {
        const currentState = latestStateRef.current

        if (currentState.isStarted && !currentState.isPaused) {
          return
        }

        const currentResolvedState = resolveTimerStateAt(currentState)
        const newTotalDuration = getTotalDuration()
        const nextLastUpdatedAt = Date.now()
        const nextState = createNextState({
          elapsedTime: currentResolvedState.isStarted
            ? currentResolvedState.elapsedTime
            : 0,
          isPaused: false,
          isStarted: true,
          lastUpdatedAt: nextLastUpdatedAt,
          totalDuration: newTotalDuration,
        })
        commitNextState(nextState)
        onAction("start", nextState)
      }

      const pauseTimer = () => {
        const currentState = latestStateRef.current

        if (!currentState.isStarted || currentState.isPaused) {
          return
        }

        const currentResolvedState = resolveTimerStateAt(currentState)
        const nextLastUpdatedAt = Date.now()
        const nextState = createNextState({
          elapsedTime: currentResolvedState.elapsedTime,
          isPaused: true,
          isStarted: true,
          lastUpdatedAt: nextLastUpdatedAt,
          totalDuration: currentState.totalDuration,
        })
        commitNextState(nextState)
        onAction("pause", nextState)
      }

      switch (action) {
        case "pause":
          pauseTimer()
          break
        case "reset":
          {
            const nextState = createNextState({
              elapsedTime: 0,
              isPaused: true,
              isStarted: false,
              lastUpdatedAt: Date.now(),
              totalDuration: getTotalDuration(),
            })
            commitNextState(nextState)
            onAction(action, nextState)
          }
          break
        case "start":
          startTimer()
          break
      }
    },
    [canMutate, commitNextState, createNextState, getTotalDuration, onAction],
  )

  const handlePrimaryShortcut = useCallback(() => {
    if (!shortcutsEnabled) {
      return
    }

    handleAction(isTimedOut ? "reset" : isPaused ? "start" : "pause")
  }, [handleAction, isPaused, isTimedOut, shortcutsEnabled])

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

    if (event.key === " " && timerWindow?.__timerSpaceShortcutConsumed) {
      timerWindow.__timerSpaceShortcutConsumed = false
      return
    }

    const target = event.target
    if (
      target instanceof HTMLElement &&
      target.tagName === "BUTTON" &&
      (event.key === "Enter" || event.key === " ")
    ) {
      return
    }
    switch (event.key) {
      case "r":
      case "Escape":
        handleAction("reset")
        break
      case "Enter":
      case " ":
        handlePrimaryShortcut()
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
      handlePrimaryShortcut()
    }

    window.addEventListener("timer-space-shortcut", handleTimerSpaceShortcut)
    return () => {
      window.removeEventListener(
        "timer-space-shortcut",
        handleTimerSpaceShortcut,
      )
    }
  }, [handlePrimaryShortcut])

  const setState = useCallback(
    ({
      elapsedTime,
      isPaused,
      revision,
      isStarted,
      lastUpdatedAt,
      totalDuration,
    }: TimerState) => {
      setRevision(() => revision)
      setElapsedTime(() => elapsedTime)
      setIsPaused(() => isPaused)
      setIsStarted(() => isStarted)
      setLastUpdatedAt(() => lastUpdatedAt)
      setTotalDuration(() => totalDuration)
    },
    [],
  )

  latestStateRef.current = {
    ...resolvedState,
    revision,
  }
  syncStateRef.current = latestStateRef.current

  return useMemo(
    () => ({
      minutes,
      seconds,
      isStarted,
      isPaused,
      isTimedOut,
      elapsedPercentage,
      handleAction,
      setState,
    }),
    [
      minutes,
      seconds,
      isStarted,
      isPaused,
      isTimedOut,
      elapsedPercentage,
      handleAction,
      setState,
    ],
  )
}
