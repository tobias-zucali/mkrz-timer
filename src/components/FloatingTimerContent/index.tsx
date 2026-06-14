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
  accessibleTimerText,
  title,
  backgroundColor,
  foregroundColor,
  isFinished,
  primaryColor,
  minutes,
  seconds,
  elapsedPercentage,
}: {
  accessibleTimerText: string
  title: string
  backgroundColor: string
  foregroundColor: string
  isFinished: boolean
  primaryColor: string
  minutes: string
  seconds: string
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
          <output
            aria-atomic="true"
            aria-label={accessibleTimerText}
            className={`
              flex max-w-full flex-nowrap items-baseline justify-center
              font-mono font-bold
              ${isFinished ? "animate-pulse text-primary" : ""}
            `}
            data-testid="floating-timer-display"
            role="timer"
            style={{
              fontSize: getResponsiveClamp({
                max: 7,
                min: 3,
              }),
            }}
          >
            <span aria-hidden="true" className="min-w-0 text-right">
              {minutes}
            </span>
            <span
              aria-hidden="true"
              className="shrink-0 px-[0.12em] text-center"
            >
              :
            </span>
            <span aria-hidden="true" className="min-w-0 text-left">
              {seconds}
            </span>
          </output>
        </div>
      </div>
    </div>
  )
}
