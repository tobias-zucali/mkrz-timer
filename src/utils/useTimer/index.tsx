"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  prefixZeros,
  getSecondsDuration,
  getMinutesSeconds,
} from "@/utils/timeInputHelpers";
import useAnimationFrame from "@/utils/useAnimationFrame";
import useGlobalKeyUp from "@/utils/useGlobalKeyUp";
import { ClientSyncData } from "@/utils/usePeer";


export default function useTimer(params: ClientSyncData) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  const isStarted = elapsedTime > 0;

  const totalDuration = getSecondsDuration(params.m, params.s);
  const remainingSecondsRef = useRef(totalDuration);

  const elapsedPercentage = elapsedTime / totalDuration;
  const isTimedOut = elapsedPercentage >= 1;

  useEffect(() => {
    if (isTimedOut) {
      new Audio("/sounds/Attention.mps3").play();
    }
  }, [isTimedOut]);

  const [minutes = prefixZeros(params.m), seconds = prefixZeros(params.s)] =
    isStarted
      ? getMinutesSeconds(totalDuration * (1 - elapsedPercentage), 10)
      : [];

  useAnimationFrame(
    (deltaTime) => setElapsedTime((prevState) => prevState + deltaTime / 1000),
    { isPaused }
  );

  const resetTimer = useCallback(() => {
    remainingSecondsRef.current = totalDuration;
    setIsPaused(true);
    setElapsedTime(0);
  }, [totalDuration]);

  const toggleTimer = useCallback(() => {
    setIsPaused((prevState) => !prevState);
  }, []);

  useGlobalKeyUp((event: KeyboardEvent) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.tagName === "BUTTON") {
      return;
    }
    switch (event.key) {
      case "r":
      case "Escape":
        resetTimer();
        break;
      case "Enter":
      case " ":
      case "p":
        if (!isTimedOut) {
          toggleTimer();
        }
        break;
    }
  });
  return useMemo(() => ({
    minutes,
    seconds,
    isStarted,
    isPaused,
    isTimedOut,
    elapsedPercentage,
    resetTimer,
    toggleTimer,
  }), [minutes, seconds, isStarted, isPaused, isTimedOut, elapsedPercentage, resetTimer, toggleTimer]);
}
