"use client"

import Pie from "@/components/Pie"
import { hexToRgbChannels } from "@/utils/colors"
import { getResponsiveClamp } from "@/utils/responsiveClamp"
import {
  getTimerTitleBoxStyle,
  getTimerTitleFontStyle,
  getTimerTitleReservedHeight,
  TIMER_TITLE_TEXT_CLASS_NAME,
} from "@/utils/timerTitleLayout"
import classNames from "classnames"

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
  const titleFontStyle = getTimerTitleFontStyle({
    text: title,
  })
  const titleBoxStyle = getTimerTitleBoxStyle()
  const hasTitle = title.trim().length > 0

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
        className={classNames(
          hasTitle && "relative z-10 shrink-0 overflow-visible",
        )}
        style={{
          height: hasTitle
            ? getTimerTitleReservedHeight({
                hasText: true,
              })
            : undefined,
        }}
      >
        {hasTitle ? (
          <p
            className={`${TIMER_TITLE_TEXT_CLASS_NAME} whitespace-pre-wrap`}
            data-testid="floating-timer-title"
            style={{
              ...titleBoxStyle,
              ...titleFontStyle,
            }}
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
              font-mono font-bold
              ${isTimedOut ? "animate-pulse text-primary" : ""}
            `}
            data-testid="floating-timer-display"
            style={{
              fontSize: getResponsiveClamp({
                max: 7,
                min: 3,
              }),
            }}
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
