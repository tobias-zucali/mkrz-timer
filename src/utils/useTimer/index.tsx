"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  prefixZeros,
  getSecondsDuration,
  getMinutesSeconds,
} from "@/utils/timeInputHelpers";
import useAnimationFrame from "@/utils/useAnimationFrame";
import useGlobalKeyUp from "@/utils/useGlobalKeyUp";
import { SyncParams } from "@/utils/usePeer";
import debug from "@/utils/debug";


export type TimerState = {
  elapsedTime: number;
  isPaused: boolean;
  totalDuration: number;
};

export type TimerActions = "reset" | "toggle";

export default function useTimer({
  onAction,
  syncStateRef,
  params,
}: {
  params: SyncParams,
  syncStateRef: React.RefObject<TimerState>,
  onAction: (action: TimerActions, state: TimerState) => void
}) {
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
      new Audio("/sounds/Attention.mp3").play().catch((error) => {
        if (error instanceof DOMException && error.name === "NotAllowedError") {
          debug.warn("Autoplay prevented");
          return;
        }
      });
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

  const handleAction = useCallback((action: "reset" | "toggle") => {
    switch (action) {
      case "reset":
        setIsPaused(true);
        setElapsedTime(0);
        onAction(action, {
          elapsedTime: 0,
          isPaused: true,
          totalDuration: getTotalDuration(),
        });
        break;
      case "toggle":
        const newTotalDuration = getTotalDuration();
        const newIsPaused = !isPaused;
        if (!isStarted) {
          setTotalDuration(newTotalDuration);
        }
        setIsPaused(newIsPaused);
        onAction(action, {
          elapsedTime,
          isPaused: newIsPaused,
          totalDuration: newTotalDuration,
        });
        break;
    }
  }, [elapsedTime, getTotalDuration, isPaused, isStarted, onAction]);

  useGlobalKeyUp((event: KeyboardEvent) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.tagName === "BUTTON"
      && (event.key === "Enter" || event.key === " ")) {
      return;
    }
    switch (event.key) {
      case "r":
      case "Escape":
        handleAction("reset");
        break;
      case "Enter":
      case " ":
        handleAction(isTimedOut ? "reset" : "toggle");
        break;
      case "p":
        if (!isTimedOut) {
          handleAction("toggle");
        }
        break;
    }
  });

  const setState = useCallback(({
    elapsedTime,
    isPaused,
    totalDuration,
  }: TimerState) => {
    setElapsedTime(elapsedTime);
    setIsPaused(isPaused);
    setTotalDuration(totalDuration);
  }, []);

  syncStateRef.current = {
    elapsedTime,
    isPaused,
    totalDuration,
  };

  return useMemo(() => ({
    minutes,
    seconds,
    isStarted,
    isPaused,
    isTimedOut,
    elapsedPercentage,
    handleAction,
    setState,
  }), [
    minutes,
    seconds,
    isStarted,
    isPaused,
    isTimedOut,
    elapsedPercentage,
    handleAction,
    setState
  ]);
}
