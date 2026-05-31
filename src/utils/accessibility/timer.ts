export type TimerReadoutState =
  | "editing"
  | "finished"
  | "paused"
  | "running"
  | "viewOnly"

type TimerTranslationFn = (
  key: string,
  values?: Record<string, string | number>,
) => string

export function formatDurationForAccessibility(
  totalSeconds: number,
  t: TimerTranslationFn,
) {
  const normalizedSeconds = Math.max(0, Math.round(totalSeconds))
  const minutes = Math.floor(normalizedSeconds / 60)
  const seconds = normalizedSeconds % 60

  if (minutes === 0) {
    return t("durationOnlySeconds", {
      seconds,
    })
  }

  if (seconds === 0) {
    return t("durationOnlyMinutes", {
      minutes,
    })
  }

  return t("durationMinutesAndSeconds", {
    minutes,
    seconds,
  })
}

export function getTimerReadoutStateLabel(
  state: TimerReadoutState,
  t: TimerTranslationFn,
) {
  switch (state) {
    case "editing":
      return t("stateReady")
    case "running":
      return t("stateRunning")
    case "paused":
      return t("statePaused")
    case "finished":
      return t("stateFinished")
    case "viewOnly":
      return t("stateViewOnly")
  }
}

export function buildTimerStepLabel({
  activeIndex,
  rowCount,
  title,
  t,
}: {
  activeIndex: number
  rowCount: number
  title: string
  t: TimerTranslationFn
}) {
  const trimmedTitle = title.trim()

  if (trimmedTitle) {
    return t("currentStepWithName", {
      step: activeIndex + 1,
      title: trimmedTitle,
      total: rowCount,
    })
  }

  return t("currentStep", {
    step: activeIndex + 1,
    total: rowCount,
  })
}

export function buildTimerReadoutLabel({
  activeIndex,
  readoutState,
  remainingSeconds,
  rowCount,
  stepTitle = "",
  t,
}: {
  activeIndex: number
  readoutState: TimerReadoutState
  remainingSeconds: number
  rowCount: number
  stepTitle?: string
  t: TimerTranslationFn
}) {
  const parts = [
    getTimerReadoutStateLabel(readoutState, t),
    t("remainingTimeLabel"),
    formatDurationForAccessibility(remainingSeconds, t),
  ]

  if (rowCount > 1) {
    parts.push(
      buildTimerStepLabel({
        activeIndex,
        rowCount,
        t,
        title: stepTitle,
      }),
    )
  }

  return parts.join(". ")
}
