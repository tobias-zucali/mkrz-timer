type TimerTitleVariant = "floating" | "main"

type TimerTitleLayout = {
  fontSizeRem: number
  hasText: boolean
  lineHeight: number
  lineCount: number
  maxVisibleLines: number
}

type TimerTitleLayoutOptions = {
  viewportWidthPx?: number
}

const layoutConfigByVariant: Record<
  TimerTitleVariant,
  {
    baseFontSizeRem: number
    baseLineLength: number
    charPenaltyRem: number
    linePenaltyRem: number
    lineHeight: number
    maxFontSizeRem: number
    maxVisibleLines: number
    minFontSizeRem: number
  }
> = {
  floating: {
    baseFontSizeRem: 3.1,
    baseLineLength: 12,
    charPenaltyRem: 0.07,
    linePenaltyRem: 0.4,
    lineHeight: 0.98,
    maxFontSizeRem: 3,
    maxVisibleLines: 3,
    minFontSizeRem: 1.05,
  },
  main: {
    baseFontSizeRem: 5.25,
    baseLineLength: 14,
    charPenaltyRem: 0.08,
    linePenaltyRem: 0.55,
    lineHeight: 0.94,
    maxFontSizeRem: 5,
    maxVisibleLines: 4,
    minFontSizeRem: 1.75,
  },
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getVisibleLines(title: string) {
  return title
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

function getViewportWidthBonusRem(
  variant: TimerTitleVariant,
  viewportWidthPx?: number,
) {
  if (variant !== "main" || viewportWidthPx === undefined) {
    return 0
  }

  return clamp(((viewportWidthPx - 900) / 700) * 0.55, 0, 0.55)
}

export function getTimerTitleLayout(
  title: string,
  variant: TimerTitleVariant = "main",
  options: TimerTitleLayoutOptions = {},
): TimerTitleLayout {
  const plainText = title.trim()

  if (!plainText) {
    const config = layoutConfigByVariant[variant]

    return {
      fontSizeRem: config.maxFontSizeRem,
      hasText: false,
      lineCount: 0,
      lineHeight: config.lineHeight,
      maxVisibleLines: config.maxVisibleLines,
    }
  }

  const config = layoutConfigByVariant[variant]
  const lines = getVisibleLines(title)
  const lineCount = Math.max(lines.length, 1)
  const longestLineLength = Math.max(
    ...lines.map((line) => line.length),
    plainText.length,
    1,
  )
  const totalVisibleCharacters = lines.reduce(
    (sum, line) => sum + line.length,
    0,
  )
  const densityPenaltyRem = Math.max(0, totalVisibleCharacters - 28) * 0.018
  const viewportWidthBonusRem = getViewportWidthBonusRem(
    variant,
    options.viewportWidthPx,
  )

  const fontSizeRem = clamp(
    config.baseFontSizeRem -
      Math.max(0, longestLineLength - config.baseLineLength) *
        config.charPenaltyRem -
      (lineCount - 1) * config.linePenaltyRem -
      densityPenaltyRem +
      viewportWidthBonusRem,
    config.minFontSizeRem,
    config.maxFontSizeRem,
  )

  return {
    fontSizeRem: Number(fontSizeRem.toFixed(3)),
    hasText: true,
    lineCount,
    lineHeight: config.lineHeight,
    maxVisibleLines: config.maxVisibleLines,
  }
}
