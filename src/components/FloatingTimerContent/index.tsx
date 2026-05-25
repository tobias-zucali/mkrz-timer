"use client"

import Pie from "@/components/Pie"
import { hexToRgbChannels } from "@/utils/colors"
import {
  getTimerTitleBoxStyle,
  getTimerTitleFontClassName,
  getTimerTitleReservedMinHeight,
  isLongTimerTitle,
  TIMER_TITLE_TEXT_CLASS_NAME,
} from "@/utils/timerTitleLayout"
import styles from "@/components/TimerTitle/index.module.css"

export default function FloatingTimerContent({
  title,
  backgroundColor,
  foregroundColor,
  primaryColor,
  minutes,
  seconds,
  isTimedOut,
  elapsedPercentage,
}: {
  title: string
  backgroundColor: string
  foregroundColor: string
  primaryColor: string
  minutes: string
  seconds: string
  isTimedOut: boolean
  elapsedPercentage: number
}) {
  const titleFontClassName = getTimerTitleFontClassName({
    text: title,
    variant: "floating",
  })
  const titleBoxStyle = getTimerTitleBoxStyle()
  const hasTitle = title.trim().length > 0
  const isLongTitle = isLongTimerTitle(title)

  return (
    <div
      className="
        flex h-screen flex-col overflow-hidden bg-background text-foreground
      "
      data-testid="floating-timer-root"
      style={{
        ["--background"]: hexToRgbChannels(backgroundColor),
        ["--foreground"]: hexToRgbChannels(foregroundColor),
        ["--primary"]: hexToRgbChannels(primaryColor),
      }}
    >
      <div
        className="relative z-10 shrink-0 overflow-visible px-4 pt-2 pb-1"
        style={{
          height: getTimerTitleReservedMinHeight({
            hasText: hasTitle,
          }),
        }}
      >
        {hasTitle ? (
          <p
            className={`${TIMER_TITLE_TEXT_CLASS_NAME} whitespace-normal ${titleFontClassName} ${
              isLongTitle ? styles.floatingLongTitle : styles.floatingShortTitle
            }`}
            data-testid="floating-timer-title"
            style={titleBoxStyle}
          >
            {title}
          </p>
        ) : (
          <div data-testid="floating-timer-title" />
        )}
      </div>
      <div className="relative min-h-0 grow p-4">
        <Pie
          percentage={elapsedPercentage > 1 ? 0 : 100 * (1 - elapsedPercentage)}
        />
        <div className="absolute inset-0 flex items-center justify-center px-6">
          <div
            className={`
              flex max-w-full flex-nowrap items-baseline justify-center
              font-mono text-[clamp(3rem,19vw,7rem)] font-bold
              ${isTimedOut ? "animate-pulse text-primary" : ""}
            `}
            data-testid="floating-timer-display"
          >
            <span className="min-w-0 text-right">{minutes}</span>
            <span className="shrink-0 px-[0.12em] text-center">:</span>
            <span className="min-w-0 text-left">{seconds}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
