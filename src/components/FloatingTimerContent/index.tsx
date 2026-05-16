import Pie from "@/components/Pie"
import { hexToRgbChannels } from "@/utils/colors"

function getFloatingTitleFontSize(title: string) {
  const plainText = title.trim()

  const lines = plainText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  const lineCount = Math.max(lines.length, 1)
  const longestLineLength = Math.max(
    ...lines.map((line) => line.length),
    plainText.length || 0,
    1,
  )

  const fontSizeRem = Math.max(
    1.05,
    Math.min(
      3,
      3.2 - Math.max(0, longestLineLength - 12) * 0.07 - (lineCount - 1) * 0.4,
    ),
  )

  return `${fontSizeRem}rem`
}

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
  const titleFontSize = getFloatingTitleFontSize(title)

  return (
    <div
      className="flex h-screen flex-col overflow-hidden bg-background text-foreground"
      data-testid="floating-timer-root"
      style={{
        ["--background"]: hexToRgbChannels(backgroundColor),
        ["--foreground"]: hexToRgbChannels(foregroundColor),
        ["--primary"]: hexToRgbChannels(primaryColor),
      }}
    >
      <div
        className="shrink-0 overflow-hidden px-4 pt-4 text-center font-bold leading-tight"
        style={{ fontSize: titleFontSize }}
      >
        <p
          className="mx-auto max-w-full whitespace-pre-wrap break-words"
          data-testid="floating-timer-title"
        >
          {title}
        </p>
      </div>
      <div className="relative min-h-0 grow p-4">
        <Pie
          percentage={elapsedPercentage > 1 ? 0 : 100 * (1 - elapsedPercentage)}
        />
        <div className="absolute inset-0 flex items-center justify-center px-6">
          <div
            className={`flex max-w-full flex-nowrap items-baseline justify-center font-mono text-[clamp(3rem,19vw,7rem)] font-bold ${
              isTimedOut ? "animate-pulse text-primary" : ""
            }`}
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
