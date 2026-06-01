import { formatDurationForAccessibility } from "@/utils/accessibility/timer"

type TimerTranslationFn = (
  key: string,
  values?: Record<string, string | number>,
) => string

export type TimerAnnouncementSnapshot = {
  activeIndex: number
  isPaused: boolean
  isStarted: boolean
  isTimedOut: boolean
  remainingSeconds: number
  stepTitle: string
  totalDuration: number
}

export type TimerMilestone = {
  id: string
  text: string
}

const buildStartedAnnouncement = ({
  stepTitle,
  t,
  totalDuration,
}: {
  stepTitle: string
  t: TimerTranslationFn
  totalDuration: number
}) => {
  const time = formatDurationForAccessibility(totalDuration, t)
  const trimmedStepTitle = stepTitle.trim()

  if (trimmedStepTitle) {
    return t("announcementStartedWithTitle", {
      time,
      title: trimmedStepTitle,
    })
  }

  return t("announcementStartedWithoutTitle", {
    time,
  })
}

const isRunning = (snapshot: TimerAnnouncementSnapshot) =>
  snapshot.isStarted && !snapshot.isPaused

const isPausedState = (snapshot: TimerAnnouncementSnapshot) =>
  snapshot.isStarted && snapshot.isPaused

export const getTimerEventAnnouncement = ({
  current,
  previous,
  t,
}: {
  current: TimerAnnouncementSnapshot
  previous: TimerAnnouncementSnapshot
  t: TimerTranslationFn
}) => {
  if (
    previous.activeIndex !== current.activeIndex &&
    isRunning(current) &&
    !isRunning(previous)
  ) {
    return buildStartedAnnouncement({
      stepTitle: current.stepTitle,
      t,
      totalDuration: current.totalDuration,
    })
  }

  if (!previous.isStarted && isRunning(current)) {
    return buildStartedAnnouncement({
      stepTitle: current.stepTitle,
      t,
      totalDuration: current.totalDuration,
    })
  }

  if (isPausedState(previous) && isRunning(current)) {
    return t("announcementResumed", {
      time: formatDurationForAccessibility(current.remainingSeconds, t),
    })
  }

  if (!previous.isTimedOut && current.isTimedOut) {
    return t("announcementFinished")
  }

  if (previous.isStarted && !current.isStarted) {
    return t("announcementReset", {
      time: formatDurationForAccessibility(current.remainingSeconds, t),
    })
  }

  if (isRunning(previous) && isPausedState(current)) {
    return t("announcementPaused")
  }

  return null
}

export const getTimerMilestoneAnnouncement = ({
  remainingSeconds,
  t,
  totalDuration,
}: {
  remainingSeconds: number
  t: TimerTranslationFn
  totalDuration: number
}): TimerMilestone | null => {
  if (remainingSeconds === 300 && totalDuration >= 600) {
    return {
      id: "m5",
      text: t("announcementFiveMinutesRemaining"),
    }
  }

  if (remainingSeconds === 60 && totalDuration >= 90) {
    return {
      id: "m1",
      text: t("announcementOneMinuteRemaining"),
    }
  }

  if (remainingSeconds === 30 && totalDuration >= 60) {
    return {
      id: "s30",
      text: t("announcementThirtySecondsRemaining"),
    }
  }

  if (remainingSeconds === 10 && totalDuration >= 30) {
    return {
      id: "s10",
      text: t("announcementTenSecondsRemaining"),
    }
  }

  if (totalDuration < 10) {
    return null
  }

  switch (remainingSeconds) {
    case 5:
      return { id: "5", text: t("announcementCountdownFive") }
    case 4:
      return { id: "4", text: t("announcementCountdownFour") }
    case 3:
      return { id: "3", text: t("announcementCountdownThree") }
    case 2:
      return { id: "2", text: t("announcementCountdownTwo") }
    case 1:
      return { id: "1", text: t("announcementCountdownOne") }
    default:
      return null
  }
}
