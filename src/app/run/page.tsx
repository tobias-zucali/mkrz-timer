"use client";

import { useEffect, useRef } from "react";

import useParams from "@/utils/useParams";
import useSound from "@/utils/useSound";
// import beep from '@/utils/beep';

import Link from "next/link";
import useTimer from "@/utils/useTimer";
import Timer from "@/components/Timer";

export default function Run() {
  const { params, setParams, getPathWithParams } = useParams();
  const { title } = params;

  const {
    minutes,
    seconds,
    isStarted,
    isPaused,
    isTimedOut,
    elapsedPercentage,
    resetTimer,
    toggleTimer,
  } = useTimer();

  useEffect(() => {
    // initially set params
    setParams({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isTimedOutRef = useRef(false);
  const sound = useSound();

  if (isTimedOut && !isTimedOutRef.current) {
    sound?.play();
  }
  isTimedOutRef.current = isTimedOut;

  const handleChange = (key: string, value: string) =>
    setParams({ [key]: value });

  return (
    <>
      <Timer
        title={title}
        handleChange={handleChange}
        elapsedPercentage={elapsedPercentage}
        isTimedOut={isTimedOut}
        isStarted={isStarted}
        minutes={minutes}
        seconds={seconds}
        toggleTimer={toggleTimer}
        isPaused={isPaused}
        resetTimer={resetTimer}
      />
      <Link
        className="absolute bottom-4 left-4 text-foreground/50 hover:text-primary"
        href={getPathWithParams("/")}
        title="Settings"
      >
        <svg
          className="w-6 h-6"
          aria-label="Settings"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M21 13v-2a1 1 0 0 0-1-1h-.757l-.707-1.707.535-.536a1 1 0 0 0 0-1.414l-1.414-1.414a1 1 0 0 0-1.414 0l-.536.535L14 4.757V4a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v.757l-1.707.707-.536-.535a1 1 0 0 0-1.414 0L4.929 6.343a1 1 0 0 0 0 1.414l.536.536L4.757 10H4a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h.757l.707 1.707-.535.536a1 1 0 0 0 0 1.414l1.414 1.414a1 1 0 0 0 1.414 0l.536-.535 1.707.707V20a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-.757l1.707-.708.536.536a1 1 0 0 0 1.414 0l1.414-1.414a1 1 0 0 0 0-1.414l-.535-.536.707-1.707H20a1 1 0 0 0 1-1Z"
          />
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
          />
        </svg>
      </Link>
    </>
  );
}
