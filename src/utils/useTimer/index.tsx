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
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const getTotalDuration = useCallback(() => getSecondsDuration(paramsRef.current.m, paramsRef.current.s), []);

  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isPaused, setIsPaused] = useState(true);
  const [totalDuration, setTotalDuration] = useState<number>(getTotalDuration);
  const isStarted = elapsedTime > 0;

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
    setIsPaused(true);
    setElapsedTime(0);
  }, []);

  const toggleTimer = useCallback(() => {
    setIsPaused((prevIsPaused) => {
      if (!isStarted) {
        setTotalDuration(getTotalDuration());
      }
      return !prevIsPaused;
    });
  }, [getTotalDuration, isStarted]);

  useGlobalKeyUp((event: KeyboardEvent) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.tagName === "BUTTON"
      && event.key === "Enter" || event.key === " ") {
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
