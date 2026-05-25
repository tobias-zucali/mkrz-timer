export type TimerTitleVariant = "floating" | "main"

export const LONG_TIMER_TITLE_LENGTH = 32
export const TIMER_TITLE_TEXT_CLASS_NAME =
  "m-0 box-border w-full overflow-hidden text-center font-bold tracking-tight [overflow-wrap:anywhere]"

export type TimerTitleLayoutConfig = {
  lineHeight: number
  maxVisibleLines: number
}

const TIMER_TITLE_LAYOUT_CONFIG: TimerTitleLayoutConfig = {
  lineHeight: 0.94,
  maxVisibleLines: 4,
}

const fontClassNamesByVariant: Record<
  TimerTitleVariant,
  {
    longTitle: string
    shortTitle: string
  }
> = {
  floating: {
    longTitle: "text-2xl sm:text-3xl md:text-4xl",
    shortTitle: "text-3xl sm:text-4xl md:text-5xl",
  },
  main: {
    longTitle: "text-4xl sm:text-5xl md:text-6xl",
    shortTitle: "text-5xl sm:text-6xl md:text-7xl",
  },
}

const TIMER_TITLE_BOX_SPACING = {
  emptyReservedMinHeight: "clamp(2.75rem, min(5.8vw, 5.2vh), 3.25rem)",
  reservedMinHeight: "clamp(3.1rem, min(6.6vw, 5.9vh), 4.1rem)",
  horizontalPaddingEm: 0.6,
  verticalPaddingEm: 0.18,
}

export function getTimerTitleLayoutConfig() {
  return TIMER_TITLE_LAYOUT_CONFIG
}

export function getTimerTitleBoxStyle() {
  const layout = getTimerTitleLayoutConfig()
  const spacing = TIMER_TITLE_BOX_SPACING

  return {
    boxSizing: "border-box" as const,
    lineHeight: layout.lineHeight,
    maxHeight: `${
      layout.maxVisibleLines * layout.lineHeight + spacing.verticalPaddingEm * 2
    }em`,
    minHeight: `${layout.lineHeight + spacing.verticalPaddingEm * 2}em`,
    paddingBottom: `${spacing.verticalPaddingEm}em`,
    paddingLeft: `${spacing.horizontalPaddingEm}em`,
    paddingRight: `${spacing.horizontalPaddingEm}em`,
    paddingTop: `${spacing.verticalPaddingEm}em`,
  }
}

export function getTimerTitleReservedMinHeight({
  hasText,
}: {
  hasText: boolean
}) {
  return hasText
    ? TIMER_TITLE_BOX_SPACING.reservedMinHeight
    : TIMER_TITLE_BOX_SPACING.emptyReservedMinHeight
}

export function getTimerTitleFontClassName({
  text,
  variant = "main",
}: {
  text: string
  variant?: TimerTitleVariant
}) {
  const fontClassNames = fontClassNamesByVariant[variant]

  return isLongTimerTitle(text)
    ? fontClassNames.longTitle
    : fontClassNames.shortTitle
}

export function isLongTimerTitle(text: string) {
  return text.trim().length > LONG_TIMER_TITLE_LENGTH
}
