"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"

import { formatDurationForAccessibility } from "@/utils/accessibility/timer"

type TimerAnnouncementsProps = {
  activeIndex: number
  isPaused: boolean
  isStarted: boolean
  isTimedOut: boolean
  minutes: string
  rowsLength: number
  seconds: string
  sessionAccessibilityLabel: string
}

export default function TimerAnnouncements({
  activeIndex,
  isPaused,
  isStarted,
  isTimedOut,
  minutes,
  rowsLength,
  seconds,
  sessionAccessibilityLabel,
}: TimerAnnouncementsProps) {
  const tPage = useTranslations("TimerPage.page")
  const tTimer = useTranslations("Timer")
  const [liveAnnouncement, setLiveAnnouncement] = useState("")

  const announce = useCallback((message: string) => {
    setLiveAnnouncement("")
    window.requestAnimationFrame(() => {
      setLiveAnnouncement(message)
    })
  }, [])

  const previousTimerSnapshotRef = useRef({
    activeIndex,
    isPaused,
    isStarted,
    isTimedOut,
  })
  const previousRemoteAnnouncementRef = useRef(sessionAccessibilityLabel)
  const announcedMilestonesRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    const previous = previousTimerSnapshotRef.current
    const currentStepLabel =
      rowsLength > 1 ? `${activeIndex + 1} of ${rowsLength}` : "1 of 1"
    const durationLabel = formatDurationForAccessibility(
      Number.parseInt(minutes, 10) * 60 + Number.parseInt(seconds, 10),
      tTimer,
    )

    if (!previous.isStarted && isStarted && !isPaused) {
      announce(
        tTimer("announcementStarted", {
          time: durationLabel,
        }),
      )
      announcedMilestonesRef.current = new Set()
    } else if (previous.isStarted && !previous.isPaused && isPaused) {
      announce(
        isTimedOut
          ? tTimer("announcementFinished")
          : tTimer("announcementPaused", {
              time: durationLabel,
            }),
      )
    } else if (previous.isStarted && !isStarted) {
      announce(
        tTimer("announcementReset", {
          time: durationLabel,
        }),
      )
      announcedMilestonesRef.current = new Set()
    } else if (previous.activeIndex !== activeIndex) {
      announce(
        tTimer("announcementStepChanged", {
          step: currentStepLabel,
          time: durationLabel,
        }),
      )
      announcedMilestonesRef.current = new Set()
    }

    if (!isStarted || isPaused) {
      announcedMilestonesRef.current = new Set()
    } else {
      const remainingSeconds =
        Number.parseInt(minutes, 10) * 60 + Number.parseInt(seconds, 10)

      if (remainingSeconds === 60 && !announcedMilestonesRef.current.has(60)) {
        announce(tTimer("announcementOneMinuteRemaining"))
        announcedMilestonesRef.current.add(60)
      } else if (
        remainingSeconds > 0 &&
        remainingSeconds <= 10 &&
        !announcedMilestonesRef.current.has(remainingSeconds)
      ) {
        announce(
          tTimer("announcementSecondsRemaining", {
            seconds: remainingSeconds,
          }),
        )
        announcedMilestonesRef.current.add(remainingSeconds)
      }
    }

    previousTimerSnapshotRef.current = {
      activeIndex,
      isPaused,
      isStarted,
      isTimedOut,
    }
  }, [
    activeIndex,
    announce,
    isPaused,
    isStarted,
    isTimedOut,
    minutes,
    rowsLength,
    seconds,
    tTimer,
  ])

  useEffect(() => {
    const currentAnnouncement = sessionAccessibilityLabel
    if (currentAnnouncement !== previousRemoteAnnouncementRef.current) {
      announce(currentAnnouncement)
      previousRemoteAnnouncementRef.current = currentAnnouncement
    }
  }, [announce, sessionAccessibilityLabel])

  return (
    <div
      aria-atomic="true"
      aria-label={tPage("screenReaderAnnouncements")}
      aria-live="polite"
      className="sr-only"
      data-testid="timer-live-region"
      role="status"
    >
      {liveAnnouncement}
    </div>
  )
}
