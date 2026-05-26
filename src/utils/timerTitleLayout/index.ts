import { getResponsiveClamp } from "@/utils/responsiveClamp"

export const LONG_TIMER_TITLE_LENGTH = 32
export const CLAMPED_TIMER_TITLE_LENGTH = 56
export const TIMER_TITLE_TEXT_CLASS_NAME =
  "m-0 box-border w-full overflow-hidden text-center font-bold tracking-tight [overflow-wrap:anywhere]"

export type TimerTitleLayoutConfig = {
  lineHeight: number
  maxVisibleLines: number
}

type TimerTitleFontConfig = {
  longTitle: string
  shortTitle: string
}

const TIMER_TITLE_LAYOUT_CONFIG: TimerTitleLayoutConfig = {
  lineHeight: 0.94,
  maxVisibleLines: 4,
}

const timerTitleFontSizes: TimerTitleFontConfig = {
  longTitle: getResponsiveClamp({
    factor: 5.8,
    max: 3.75,
    min: 2,
  }),
  shortTitle: getResponsiveClamp({
    factor: 6.8,
    max: 4.5,
    min: 2.4,
  }),
}

const TIMER_TITLE_BOX_SPACING = {
  emptyReservedMinHeight: getResponsiveClamp({
    factor: 5.5,
    max: 3.25,
    min: 2.75,
  }),
  reservedMinHeight: getResponsiveClamp({
    factor: 7,
    max: 4.1,
    min: 2.6,
  }),
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

export function getTimerTitleFontStyle({ text }: { text: string }) {
  return {
    fontSize: isLongTimerTitle(text)
      ? timerTitleFontSizes.longTitle
      : timerTitleFontSizes.shortTitle,
  }
}

export function isLongTimerTitle(text: string) {
  return text.trim().length > LONG_TIMER_TITLE_LENGTH
}

export function isClampedTimerTitle(text: string) {
  return text.trim().length > CLAMPED_TIMER_TITLE_LENGTH
}
