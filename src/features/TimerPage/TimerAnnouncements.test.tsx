import type { ComponentProps } from "react"
import { render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { defaultAppLocale } from "@/i18n/config"
import { getMessagesForLocale } from "@/i18n/messages"

import TimerAnnouncements from "./TimerAnnouncements"

class MockSpeechSynthesisUtterance {
  lang = ""
  text: string

  constructor(text: string) {
    this.text = text
  }
}

type TimerAnnouncementsTestProps = ComponentProps<typeof TimerAnnouncements>

const messages = getMessagesForLocale(defaultAppLocale)
const cancel = vi.fn()
const speak = vi.fn()

const buildProps = (
  overrides: Partial<TimerAnnouncementsTestProps> = {},
): TimerAnnouncementsTestProps => ({
  activeIndex: 0,
  isPaused: true,
  isStarted: false,
  isTimedOut: false,
  minutes: "01",
  seconds: "00",
  sessionAccessibilityLabel: "Private session",
  stepTitle: "",
  totalDuration: 60,
  ttsEnabled: false,
  ...overrides,
})

const renderComponent = (props: TimerAnnouncementsTestProps) =>
  render(
    <NextIntlClientProvider locale={defaultAppLocale} messages={messages}>
      <TimerAnnouncements {...props} />
    </NextIntlClientProvider>,
  )

describe("TimerAnnouncements", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "SpeechSynthesisUtterance",
      MockSpeechSynthesisUtterance as unknown as typeof SpeechSynthesisUtterance,
    )
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0)
      return 0
    })
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        cancel,
        speak,
      },
    })
    cancel.mockReset()
    speak.mockReset()
  })

  it("keeps live-region and speech announcements synchronized", async () => {
    const { rerender } = renderComponent(buildProps({ ttsEnabled: true }))

    rerender(
      <NextIntlClientProvider locale={defaultAppLocale} messages={messages}>
        <TimerAnnouncements
          {...buildProps({
            isPaused: false,
            isStarted: true,
            totalDuration: 90,
            ttsEnabled: true,
          })}
        />
      </NextIntlClientProvider>,
    )

    const liveRegion = screen.getByRole("status", {
      name: "Timer announcements",
    })

    await waitFor(() => {
      expect(liveRegion).toHaveTextContent(
        "1 minute, 30 seconds timer started.",
      )
      expect(speak).toHaveBeenCalledTimes(1)
    })

    expect(cancel).toHaveBeenCalled()
    expect(
      (speak.mock.calls[0]?.[0] as MockSpeechSynthesisUtterance).text,
    ).toBe(liveRegion.textContent)
    expect(
      (speak.mock.calls[0]?.[0] as MockSpeechSynthesisUtterance).lang,
    ).toBe(defaultAppLocale)
  })

  it("does not speak announcements when voice announcements are disabled", async () => {
    const { rerender } = renderComponent(buildProps({ ttsEnabled: false }))

    rerender(
      <NextIntlClientProvider locale={defaultAppLocale} messages={messages}>
        <TimerAnnouncements
          {...buildProps({
            isPaused: false,
            isStarted: true,
            totalDuration: 90,
            ttsEnabled: false,
          })}
        />
      </NextIntlClientProvider>,
    )

    await waitFor(() => {
      expect(
        screen.getByRole("status", { name: "Timer announcements" }),
      ).toHaveTextContent("1 minute, 30 seconds timer started.")
    })

    expect(speak).not.toHaveBeenCalled()
  })

  it("does not replay the last timer announcement when voice announcements are enabled later", async () => {
    const { rerender } = renderComponent(buildProps({ ttsEnabled: false }))

    rerender(
      <NextIntlClientProvider locale={defaultAppLocale} messages={messages}>
        <TimerAnnouncements
          {...buildProps({
            isPaused: false,
            isStarted: true,
            totalDuration: 90,
            ttsEnabled: false,
          })}
        />
      </NextIntlClientProvider>,
    )

    await waitFor(() => {
      expect(
        screen.getByRole("status", { name: "Timer announcements" }),
      ).toHaveTextContent("1 minute, 30 seconds timer started.")
    })

    rerender(
      <NextIntlClientProvider locale={defaultAppLocale} messages={messages}>
        <TimerAnnouncements
          {...buildProps({
            isPaused: false,
            isStarted: true,
            totalDuration: 90,
            ttsEnabled: true,
          })}
        />
      </NextIntlClientProvider>,
    )

    expect(speak).not.toHaveBeenCalled()
  })

  it("keeps start announcements when a milestone would also match the same update", async () => {
    const { rerender } = renderComponent(buildProps({ ttsEnabled: true }))

    rerender(
      <NextIntlClientProvider locale={defaultAppLocale} messages={messages}>
        <TimerAnnouncements
          {...buildProps({
            isPaused: false,
            isStarted: true,
            totalDuration: 60,
            ttsEnabled: true,
          })}
        />
      </NextIntlClientProvider>,
    )

    await waitFor(() => {
      expect(
        screen.getByRole("status", { name: "Timer announcements" }),
      ).toHaveTextContent("1 minute timer started.")
    })

    expect(
      (speak.mock.calls[0]?.[0] as MockSpeechSynthesisUtterance).text,
    ).toBe("1 minute timer started.")
  })

  it("cancels superseded utterances and speaks the latest shared announcement", async () => {
    const { rerender } = renderComponent(buildProps({ ttsEnabled: true }))

    rerender(
      <NextIntlClientProvider locale={defaultAppLocale} messages={messages}>
        <TimerAnnouncements
          {...buildProps({
            isPaused: false,
            isStarted: true,
            totalDuration: 30,
            ttsEnabled: true,
          })}
        />
      </NextIntlClientProvider>,
    )

    await waitFor(() => {
      expect(
        screen.getByRole("status", { name: "Timer announcements" }),
      ).toHaveTextContent("30 seconds timer started.")
    })

    rerender(
      <NextIntlClientProvider locale={defaultAppLocale} messages={messages}>
        <TimerAnnouncements
          {...buildProps({
            isPaused: true,
            isStarted: true,
            minutes: "00",
            seconds: "24",
            totalDuration: 30,
            ttsEnabled: true,
          })}
        />
      </NextIntlClientProvider>,
    )

    await waitFor(() => {
      expect(
        screen.getByRole("status", { name: "Timer announcements" }),
      ).toHaveTextContent("Paused.")
    })

    expect(speak).toHaveBeenCalledTimes(2)
    expect(cancel.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(
      (speak.mock.calls.at(-1)?.[0] as MockSpeechSynthesisUtterance).text,
    ).toBe("Paused.")
  })

  it("speaks the finish announcement when the timer times out", async () => {
    const { rerender } = renderComponent(buildProps({ ttsEnabled: true }))

    rerender(
      <NextIntlClientProvider locale={defaultAppLocale} messages={messages}>
        <TimerAnnouncements
          {...buildProps({
            isPaused: false,
            isStarted: true,
            minutes: "00",
            seconds: "01",
            totalDuration: 30,
            ttsEnabled: true,
          })}
        />
      </NextIntlClientProvider>,
    )

    await waitFor(() => {
      expect(
        screen.getByRole("status", { name: "Timer announcements" }),
      ).toHaveTextContent("30 seconds timer started.")
    })

    rerender(
      <NextIntlClientProvider locale={defaultAppLocale} messages={messages}>
        <TimerAnnouncements
          {...buildProps({
            isPaused: false,
            isStarted: true,
            isTimedOut: true,
            minutes: "00",
            seconds: "00",
            totalDuration: 30,
            ttsEnabled: true,
          })}
        />
      </NextIntlClientProvider>,
    )

    await waitFor(() => {
      expect(
        screen.getByRole("status", { name: "Timer announcements" }),
      ).toHaveTextContent("Time is up.")
      expect(speak).toHaveBeenCalledTimes(2)
    })

    expect(
      (speak.mock.calls.at(-1)?.[0] as MockSpeechSynthesisUtterance).text,
    ).toBe("Time is up.")
  })

  it("does not speak non-timer accessibility announcements", async () => {
    const { rerender } = renderComponent(buildProps({ ttsEnabled: true }))

    rerender(
      <NextIntlClientProvider locale={defaultAppLocale} messages={messages}>
        <TimerAnnouncements
          {...buildProps({
            sessionAccessibilityLabel: "Live session, Error, CONTROL access",
            ttsEnabled: true,
          })}
        />
      </NextIntlClientProvider>,
    )

    await waitFor(() => {
      expect(
        screen.getByRole("status", { name: "Timer announcements" }),
      ).toHaveTextContent("Live session, Error, CONTROL access")
    })

    expect(speak).not.toHaveBeenCalled()
  })

  it("cancels speech synthesis on unmount", () => {
    const { unmount } = renderComponent(buildProps({ ttsEnabled: true }))

    unmount()

    expect(cancel).toHaveBeenCalled()
  })
})
