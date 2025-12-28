"use client";

import EditableHtml from "@/components/EditableHtml";
import Pie from "@/components/Pie";
import DigitalDisplay from "@/components/DigitalDisplay";

export default function Timer({
  title,
  handleChange,
  elapsedPercentage,
  isTimedOut,
  isStarted,
  minutes,
  seconds,
  toggleTimer,
  isPaused,
  resetTimer,
} : {
  title: string,
  handleChange: (key: string, value: string) => void,
  elapsedPercentage: number,
  isTimedOut: boolean,
  isStarted: boolean,
  minutes: string,
  seconds: string,
  toggleTimer: () => void,
  isPaused: boolean,
  resetTimer: () => void
}) {
  const buttonClassName =
    "bg-foreground disabled:opacity-50 text-background cursor-pointer disabled:cursor-default " +
    "px-2 mx-1 rounded-sm hover:outline-secondary hover:outline-2 hover:outline-offset-2";
  return (
    <div className="flex flex-col h-full">
      <EditableHtml
        html={title}
        onChange={(value) => handleChange("title", value)}
        className="text-center text-[3em] font-bold pt-1 hover:outline-4 hover:-outline-offset-4 md:text-[5em] rouded-lg"
        title="Click to edit title"
      />
      <div className="flex items-center justify-center grow h-[10em] p-[1em] relative">
        <Pie
          percentage={elapsedPercentage > 1 ? 0 : 100 * (1 - elapsedPercentage)}
        />

        <div className="flex flex-col items-center justify-center grow absolute inset-0">
          <DigitalDisplay
            isAlert={isTimedOut}
            isReadonly={isStarted}
            minutes={minutes}
            seconds={seconds}
            onMinutesChange={(event) => handleChange("m", event.target.value)}
            onSecondsChange={(event) => handleChange("s", event.target.value)}
          />
          <div className="text-center py-[0.5em]">
            <button
              className={buttonClassName}
              disabled={isTimedOut}
              onClick={toggleTimer}
            >
              {isPaused ? "START" : "PAUSE"}
            </button>
            <button
              className={buttonClassName}
              disabled={!isStarted}
              onClick={resetTimer}
            >
              RESET
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
