import { render, screen } from "@testing-library/react"

import TimerControls from "./TimerControls"

const baseProps = {
  isPaused: true,
  isResetDisabled: false,
  isTimedOut: false,
  onPause: vi.fn(),
  onReset: vi.fn(),
  onStart: vi.fn(),
  pauseLabel: "PAUSE",
  resetLabel: "RESET",
  startLabel: "START",
  stateLabel: "Timer paused",
}

describe("TimerControls", () => {
  it("keeps timer action buttons present while dimmed", () => {
    render(<TimerControls {...baseProps} isDimmed />)

    const controls = screen.getByTestId("timer-controls")
    expect(controls).toBeInTheDocument()
    expect(controls).toHaveAttribute("data-dimmed", "true")
    expect(controls.className).toContain("timer-chrome-dimmed")
    expect(screen.getByRole("button", { name: "START" })).toBeVisible()
    expect(screen.getByRole("button", { name: "RESET" })).toBeVisible()
  })

  it("uses opacity transitions instead of layout removal", () => {
    render(<TimerControls {...baseProps} isDimmed={false} />)

    const controls = screen.getByTestId("timer-controls")
    expect(controls).toHaveAttribute("data-dimmed", "false")
    expect(controls.className).toContain("timer-chrome-transition")
    expect(controls.className).toContain("opacity-100")
  })

  it("disables reset when no time has elapsed", () => {
    render(<TimerControls {...baseProps} isDimmed={false} isResetDisabled />)

    expect(screen.getByRole("button", { name: "RESET" })).toBeDisabled()
  })
})
