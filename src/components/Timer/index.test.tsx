import { fireEvent, render, screen } from "@testing-library/react"

import type useTimer from "@/utils/useTimer"

import Timer from "./index"

const timerStub = {
  elapsedPercentage: 0,
  handleAction: vi.fn(),
  isPaused: true,
  isStarted: false,
  isTimedOut: false,
  minutes: "01",
  seconds: "00",
  setState: vi.fn(),
} as ReturnType<typeof useTimer>

describe("Timer", () => {
  it("keeps raw time edits while the user is typing and normalizes on blur only", () => {
    const handleChange = vi.fn()
    const handleTimeBlur = vi.fn()

    render(
      <Timer
        handleChange={handleChange}
        handleTimeBlur={handleTimeBlur}
        timer={timerStub}
        title="Agenda"
      />,
    )

    const minutesInput = screen.getByRole("spinbutton", { name: "Minutes" })
    const secondsInput = screen.getByRole("spinbutton", { name: "Seconds" })

    fireEvent.change(minutesInput, { target: { value: "1" } })
    fireEvent.change(secondsInput, { target: { value: "90" } })

    expect(handleChange).toHaveBeenNthCalledWith(1, "m", "1")
    expect(handleChange).toHaveBeenNthCalledWith(2, "s", "90")
    expect(handleTimeBlur).not.toHaveBeenCalled()

    fireEvent.blur(secondsInput)

    expect(handleTimeBlur).toHaveBeenCalledTimes(1)
  })
})
