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

export type TimerState = {
  elapsedTime: number
  isPaused: boolean
  revision: number
  isStarted: boolean
  totalDuration: number
}

export type TimerActions = "pause" | "reset" | "start"

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
  const [revision, setRevision] = useState(0)
  const [totalDuration, setTotalDuration] = useState<number>(getTotalDuration)
  const latestStateRef = useRef<TimerState>({
    elapsedTime,
    isPaused,
    revision,
    isStarted,
    totalDuration,
  })

  const elapsedPercentage = elapsedTime / totalDuration
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
    (deltaTime) => setElapsedTime((prevState) => prevState + deltaTime / 1000),
    { isPaused },
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

        const newTotalDuration = getTotalDuration()
        if (!currentState.isStarted) {
          setTotalDuration(newTotalDuration)
          setIsStarted(true)
          setElapsedTime(0)
        }
        setIsPaused(false)
        const nextState = createNextState({
          elapsedTime: currentState.isStarted ? currentState.elapsedTime : 0,
          isPaused: false,
          isStarted: true,
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

        const nextState = createNextState({
          elapsedTime: currentState.elapsedTime,
          isPaused: true,
          isStarted: true,
          totalDuration: currentState.totalDuration,
        })
        commitNextState(nextState)
        onAction("pause", nextState)
        setIsPaused(true)
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
              totalDuration: getTotalDuration(),
            })
            commitNextState(nextState)
            setIsPaused(true)
            setIsStarted(false)
            setElapsedTime(0)
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

  useGlobalKeyUp((event: KeyboardEvent) => {
    if (!shortcutsEnabled) {
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
        handleAction(isTimedOut ? "reset" : isPaused ? "start" : "pause")
        break
      case "p":
        if (!isTimedOut) {
          handleAction(isPaused ? "start" : "pause")
        }
        break
    }
  })

  const setState = useCallback(
    ({
      elapsedTime,
      isPaused,
      revision,
      isStarted,
      totalDuration,
    }: TimerState) => {
      if (revision < latestStateRef.current.revision) {
        return
      }

      setRevision(() => revision)
      setElapsedTime(() => elapsedTime)
      setIsPaused(() => isPaused)
      setIsStarted(() => isStarted)
      setTotalDuration(() => totalDuration)
    },
    [],
  )

  latestStateRef.current = {
    elapsedTime,
    isPaused,
    revision,
    isStarted,
    totalDuration,
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
