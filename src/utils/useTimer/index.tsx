"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  prefixZeros,
  getSecondsDuration,
  getMinutesSeconds,
} from "@/utils/timeInputHelpers"
import useAnimationFrame from "@/utils/useAnimationFrame"
import useGlobalKeyUp from "@/utils/useGlobalKeyUp"
import { SyncParams } from "@/utils/usePeer"
import debug from "@/utils/debug"

export type TimerState = {
  elapsedTime: number
  isPaused: boolean
  isStarted: boolean
  totalDuration: number
}

export type TimerActions = "pause" | "reset" | "start"

export default function useTimer({
  onAction,
  syncStateRef,
  params,
  shortcutsEnabled = true,
}: {
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
  const [totalDuration, setTotalDuration] = useState<number>(getTotalDuration)

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

  const handleAction = useCallback(
    (action: TimerActions) => {
      const startTimer = () => {
        if (isStarted && !isPaused) {
          return
        }

        const newTotalDuration = getTotalDuration()
        if (!isStarted) {
          setTotalDuration(newTotalDuration)
          setIsStarted(true)
          setElapsedTime(0)
        }
        setIsPaused(false)
        onAction("start", {
          elapsedTime,
          isPaused: false,
          isStarted: true,
          totalDuration: newTotalDuration,
        })
      }

      const pauseTimer = () => {
        if (!isStarted || isPaused) {
          return
        }

        onAction("pause", {
          elapsedTime,
          isPaused: true,
          isStarted: true,
          totalDuration: getTotalDuration(),
        })
        setIsPaused(true)
      }

      switch (action) {
        case "pause":
          pauseTimer()
          break
        case "reset":
          setIsPaused(true)
          setIsStarted(false)
          setElapsedTime(0)
          onAction(action, {
            elapsedTime: 0,
            isPaused: true,
            isStarted: false,
            totalDuration: getTotalDuration(),
          })
          break
        case "start":
          startTimer()
          break
      }
    },
    [elapsedTime, getTotalDuration, isPaused, isStarted, onAction],
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
    ({ elapsedTime, isPaused, isStarted, totalDuration }: TimerState) => {
      setElapsedTime(() => elapsedTime)
      setIsPaused(() => isPaused)
      setIsStarted(() => isStarted)
      setTotalDuration(() => totalDuration)
    },
    [],
  )

  syncStateRef.current = {
    elapsedTime,
    isPaused,
    isStarted,
    totalDuration,
  }

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
