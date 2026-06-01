import { describe, expect, it } from "vitest"

import { createAppTranslator } from "@/i18n/translator"

import {
  getTimerEventAnnouncement,
  getTimerMilestoneAnnouncement,
  type TimerAnnouncementSnapshot,
} from "./announcements"

const translate = createAppTranslator() as (
  key: string,
  values?: Record<string, unknown>,
) => string
const t = (key: string, values?: Record<string, string | number>) =>
  translate(`Timer.${key}`, values)

const buildSnapshot = (
  overrides: Partial<TimerAnnouncementSnapshot> = {},
): TimerAnnouncementSnapshot => ({
  activeIndex: 0,
  isPaused: true,
  isStarted: false,
  isTimedOut: false,
  remainingSeconds: 60,
  stepTitle: "",
  totalDuration: 60,
  ...overrides,
})

describe("announcement rules", () => {
  it("announces initial starts from the configured duration", () => {
    expect(
      getTimerEventAnnouncement({
        current: buildSnapshot({
          isPaused: false,
          isStarted: true,
          totalDuration: 5,
        }),
        previous: buildSnapshot(),
        t,
      }),
    ).toBe("5 seconds timer started.")

    expect(
      getTimerEventAnnouncement({
        current: buildSnapshot({
          isPaused: false,
          isStarted: true,
          stepTitle: "Discussion",
          totalDuration: 900,
        }),
        previous: buildSnapshot(),
        t,
      }),
    ).toBe("Discussion. 15 minutes started.")
  })

  it("announces resume, pause, finish, and reset", () => {
    expect(
      getTimerEventAnnouncement({
        current: buildSnapshot({
          isPaused: false,
          isStarted: true,
          remainingSeconds: 44,
          totalDuration: 90,
        }),
        previous: buildSnapshot({
          isPaused: true,
          isStarted: true,
          remainingSeconds: 45,
          totalDuration: 90,
        }),
        t,
      }),
    ).toBe("Resumed. 44 seconds remaining.")

    expect(
      getTimerEventAnnouncement({
        current: buildSnapshot({
          isPaused: true,
          isStarted: true,
          remainingSeconds: 24,
          totalDuration: 30,
        }),
        previous: buildSnapshot({
          isPaused: false,
          isStarted: true,
          remainingSeconds: 25,
          totalDuration: 30,
        }),
        t,
      }),
    ).toBe("Paused.")

    expect(
      getTimerEventAnnouncement({
        current: buildSnapshot({
          isPaused: true,
          isStarted: true,
          isTimedOut: true,
          remainingSeconds: 0,
          totalDuration: 30,
        }),
        previous: buildSnapshot({
          isPaused: false,
          isStarted: true,
          remainingSeconds: 1,
          totalDuration: 30,
        }),
        t,
      }),
    ).toBe("Time is up.")

    expect(
      getTimerEventAnnouncement({
        current: buildSnapshot({
          isPaused: true,
          isStarted: false,
          remainingSeconds: 90,
          totalDuration: 90,
        }),
        previous: buildSnapshot({
          isPaused: true,
          isStarted: true,
          remainingSeconds: 12,
          totalDuration: 90,
        }),
        t,
      }),
    ).toBe("Timer reset to 1 minute, 30 seconds.")

    expect(
      getTimerEventAnnouncement({
        current: buildSnapshot({
          isPaused: true,
          isStarted: false,
          remainingSeconds: 30,
          totalDuration: 30,
        }),
        previous: buildSnapshot({
          isPaused: false,
          isStarted: true,
          remainingSeconds: 12,
          totalDuration: 30,
        }),
        t,
      }),
    ).toBe("Timer reset to 30 seconds.")
  })

  it("does not announce step changes outside initial starts or resumes", () => {
    expect(
      getTimerEventAnnouncement({
        current: buildSnapshot({
          activeIndex: 1,
          isPaused: true,
          isStarted: false,
          stepTitle: "Discussion",
          totalDuration: 900,
        }),
        previous: buildSnapshot({
          activeIndex: 0,
          isPaused: true,
          isStarted: false,
          stepTitle: "Intro",
          totalDuration: 300,
        }),
        t,
      }),
    ).toBeNull()

    expect(
      getTimerEventAnnouncement({
        current: buildSnapshot({
          activeIndex: 1,
          isPaused: false,
          isStarted: true,
          stepTitle: "Discussion",
          totalDuration: 900,
        }),
        previous: buildSnapshot({
          activeIndex: 0,
          isPaused: false,
          isStarted: true,
          stepTitle: "Intro",
          totalDuration: 300,
        }),
        t,
      }),
    ).toBeNull()

    expect(
      getTimerEventAnnouncement({
        current: buildSnapshot({
          activeIndex: 1,
          isPaused: true,
          isStarted: true,
          remainingSeconds: 900,
          stepTitle: "Discussion",
          totalDuration: 900,
        }),
        previous: buildSnapshot({
          activeIndex: 0,
          isPaused: true,
          isStarted: true,
          remainingSeconds: 120,
          stepTitle: "Intro",
          totalDuration: 300,
        }),
        t,
      }),
    ).toBeNull()
  })

  it("announces only the configured milestones for qualifying durations", () => {
    expect(
      getTimerMilestoneAnnouncement({
        remainingSeconds: 300,
        t,
        totalDuration: 900,
      }),
    ).toEqual({ id: "m5", text: "5 minutes remaining." })

    expect(
      getTimerMilestoneAnnouncement({
        remainingSeconds: 60,
        t,
        totalDuration: 90,
      }),
    ).toEqual({ id: "m1", text: "1 minute remaining." })

    expect(
      getTimerMilestoneAnnouncement({
        remainingSeconds: 30,
        t,
        totalDuration: 60,
      }),
    ).toEqual({ id: "s30", text: "30 seconds remaining." })

    expect(
      getTimerMilestoneAnnouncement({
        remainingSeconds: 10,
        t,
        totalDuration: 30,
      }),
    ).toEqual({ id: "s10", text: "10 seconds remaining." })

    expect(
      getTimerMilestoneAnnouncement({
        remainingSeconds: 5,
        t,
        totalDuration: 10,
      }),
    ).toEqual({ id: "5", text: "Five." })

    expect(
      getTimerMilestoneAnnouncement({
        remainingSeconds: 4,
        t,
        totalDuration: 10,
      }),
    ).toEqual({ id: "4", text: "Four." })

    expect(
      getTimerMilestoneAnnouncement({
        remainingSeconds: 1,
        t,
        totalDuration: 10,
      }),
    ).toEqual({ id: "1", text: "One." })
  })

  it("skips milestones when the total duration does not qualify", () => {
    expect(
      getTimerMilestoneAnnouncement({
        remainingSeconds: 300,
        t,
        totalDuration: 599,
      }),
    ).toBeNull()

    expect(
      getTimerMilestoneAnnouncement({
        remainingSeconds: 60,
        t,
        totalDuration: 89,
      }),
    ).toBeNull()

    expect(
      getTimerMilestoneAnnouncement({
        remainingSeconds: 30,
        t,
        totalDuration: 59,
      }),
    ).toBeNull()

    expect(
      getTimerMilestoneAnnouncement({
        remainingSeconds: 10,
        t,
        totalDuration: 29,
      }),
    ).toBeNull()

    expect(
      getTimerMilestoneAnnouncement({
        remainingSeconds: 5,
        t,
        totalDuration: 9,
      }),
    ).toBeNull()
  })
})
