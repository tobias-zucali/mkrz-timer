import { getResponsiveClamp } from "../responsiveClamp/index.ts"

export const LONG_TIMER_TITLE_LENGTH = 32
export const TIMER_TITLE_TEXT_CLASS_NAME =
  "m-0 box-border w-full text-center font-bold tracking-tight [overflow-wrap:anywhere]"

type TimerTitleFontConfig = {
  longTitle: string
  shortTitle: string
}
const TIMER_TITLE_LINE_HEIGHT = 0.94

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
  emptyReservedHeight: getResponsiveClamp({
    factor: 5.5,
    max: 3.25,
    min: 2.75,
  }),
  reservedHeight: getResponsiveClamp({
    factor: 8,
    max: 5,
    min: 2.4,
  }),
  horizontalPaddingEm: 0.6,
  verticalPaddingEm: 0.18,
}

export function getTimerTitleBoxStyle() {
  const spacing = TIMER_TITLE_BOX_SPACING

  return {
    boxSizing: "border-box" as const,
    lineHeight: TIMER_TITLE_LINE_HEIGHT,
    minHeight: `${TIMER_TITLE_LINE_HEIGHT + spacing.verticalPaddingEm * 2}em`,
    paddingBottom: `${spacing.verticalPaddingEm}em`,
    paddingLeft: `${spacing.horizontalPaddingEm}em`,
    paddingRight: `${spacing.horizontalPaddingEm}em`,
    paddingTop: `${spacing.verticalPaddingEm}em`,
  }
}

export function getTimerTitleReservedHeight({ hasText }: { hasText: boolean }) {
  return hasText
    ? TIMER_TITLE_BOX_SPACING.reservedHeight
    : TIMER_TITLE_BOX_SPACING.emptyReservedHeight
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
