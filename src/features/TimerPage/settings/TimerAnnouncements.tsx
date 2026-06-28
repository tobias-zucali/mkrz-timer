"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"

import {
  getTimerEventAnnouncement,
  getTimerMilestoneAnnouncement,
  type TimerAnnouncementSnapshot,
} from "@/features/TimerPage/announcements"

type TimerAnnouncementsProps = {
  activeIndex: number
  isFinished: boolean
  isPaused: boolean
  isStarted: boolean
  minutes: string
  seconds: string
  sessionAccessibilityLabel: string
  stepTitle: string
  totalDuration: number
  ttsEnabled: boolean
  ttsCountdowns: boolean
}

export default function TimerAnnouncements({
  activeIndex,
  isFinished,
  isPaused,
  isStarted,
  minutes,
  seconds,
  sessionAccessibilityLabel,
  stepTitle,
  totalDuration,
  ttsEnabled,
  ttsCountdowns,
}: TimerAnnouncementsProps) {
  const tPage = useTranslations("TimerPage.page")
  const tTimer = useTranslations("Timer")
  const locale = useLocale()
  const [announcement, setAnnouncement] = useState("")
  const [spokenAnnouncement, setSpokenAnnouncement] = useState("")

  const announce = useCallback(
    (message: string, { speak = true }: { speak?: boolean } = {}) => {
      setAnnouncement("")
      if (speak) {
        setSpokenAnnouncement(message)
      }
      window.requestAnimationFrame(() => {
        setAnnouncement(message)
      })
    },
    [],
  )

  const remainingSeconds =
    Number.parseInt(minutes, 10) * 60 + Number.parseInt(seconds, 10)
  const currentSnapshot = useMemo<TimerAnnouncementSnapshot>(
    () => ({
      activeIndex,
      isFinished,
      isPaused,
      isStarted,
      remainingSeconds,
      stepTitle,
      totalDuration,
    }),
    [
      activeIndex,
      isFinished,
      isPaused,
      isStarted,
      remainingSeconds,
      stepTitle,
      totalDuration,
    ],
  )

  const previousTimerSnapshotRef = useRef(currentSnapshot)
  const previousRemoteAnnouncementRef = useRef(sessionAccessibilityLabel)
  const previousTtsEnabledRef = useRef(ttsEnabled)
  const announcedMilestonesRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const previous = previousTimerSnapshotRef.current
    const eventAnnouncement = getTimerEventAnnouncement({
      current: currentSnapshot,
      previous,
      t: tTimer,
    })
    const didStartRunning =
      (!previous.isStarted &&
        currentSnapshot.isStarted &&
        !currentSnapshot.isPaused) ||
      (previous.isStarted &&
        previous.isPaused &&
        currentSnapshot.isStarted &&
        !currentSnapshot.isPaused) ||
      (previous.activeIndex !== currentSnapshot.activeIndex &&
        currentSnapshot.isStarted &&
        !currentSnapshot.isPaused)
    const shouldResetMilestones = !currentSnapshot.isStarted || didStartRunning

    if (shouldResetMilestones) {
      announcedMilestonesRef.current = new Set()
    }

    if (eventAnnouncement) {
      announce(eventAnnouncement)
    } else if (
      ttsCountdowns &&
      currentSnapshot.isStarted &&
      !currentSnapshot.isPaused
    ) {
      const milestone = getTimerMilestoneAnnouncement({
        remainingSeconds: currentSnapshot.remainingSeconds,
        t: tTimer,
        totalDuration: currentSnapshot.totalDuration,
      })

      if (milestone && !announcedMilestonesRef.current.has(milestone.id)) {
        announce(milestone.text)
        announcedMilestonesRef.current.add(milestone.id)
      }
    }

    previousTimerSnapshotRef.current = currentSnapshot
  }, [announce, currentSnapshot, tTimer, ttsCountdowns])

  useEffect(() => {
    const currentRemoteAnnouncement = sessionAccessibilityLabel

    if (currentRemoteAnnouncement !== previousRemoteAnnouncementRef.current) {
      announce(currentRemoteAnnouncement, { speak: false })
      previousRemoteAnnouncementRef.current = currentRemoteAnnouncement
    }
  }, [announce, sessionAccessibilityLabel])

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return
    }

    const wasTtsEnabled = previousTtsEnabledRef.current
    previousTtsEnabledRef.current = ttsEnabled

    if (!ttsEnabled || !spokenAnnouncement) {
      window.speechSynthesis.cancel()
      return
    }

    if (!wasTtsEnabled && ttsEnabled) {
      return
    }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(spokenAnnouncement)
    utterance.lang = locale
    window.speechSynthesis.speak(utterance)

    return () => {
      window.speechSynthesis.cancel()
    }
  }, [locale, spokenAnnouncement, ttsEnabled])

  return (
    <div
      aria-atomic="true"
      aria-label={tPage("screenReaderAnnouncements")}
      aria-live="polite"
      className="sr-only"
      role="status"
    >
      {announcement}
    </div>
  )
}
