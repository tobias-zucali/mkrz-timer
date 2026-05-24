import { fireEvent, screen } from "@testing-library/react"

import { buildDefaultTimerSequenceRow } from "@/shared/timerSequence"
import { renderWithIntl } from "@/test/renderWithIntl"
import type useTimer from "@/utils/useTimer"

import Timer from "./index"

const timerStub = {
  activateRow: vi.fn(),
  currentRepeat: 1,
  elapsedPercentage: 0,
  handleAction: vi.fn(),
  isPaused: true,
  isStarted: false,
  isTimedOut: false,
  minutes: "01",
  seconds: "00",
  setState: vi.fn(),
} as ReturnType<typeof useTimer>

const renderTimer = ({
  activeIndex = 0,
  onSelectSequenceRow,
  rows = [buildDefaultTimerSequenceRow()],
}: {
  activeIndex?: number
  onSelectSequenceRow?: (rowIndex: number) => void
  rows?: ReturnType<typeof buildRows>
} = {}) => {
  const handleChange = vi.fn()
  const handleTimeBlur = vi.fn()

  renderWithIntl(
    <Timer
      activeIndex={activeIndex}
      handleChange={handleChange}
      handleTimeBlur={handleTimeBlur}
      onSelectSequenceRow={onSelectSequenceRow}
      rows={rows}
      timer={timerStub}
      title="Agenda"
    />,
  )

  return {
    handleChange,
    handleTimeBlur,
  }
}

const buildRows = () => [
  buildDefaultTimerSequenceRow(),
  {
    ...buildDefaultTimerSequenceRow(),
    title: "Q&A",
    totalSeconds: 120,
  },
]

describe("Timer", () => {
  it("keeps raw time edits while the user is typing and normalizes on blur only", () => {
    const { handleChange, handleTimeBlur } = renderTimer()

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

  it("keeps the old simple controls for a single-step timer", () => {
    renderTimer()

    expect(
      screen.queryByRole("button", { name: "Previous step" }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Next step" }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText("Step 1/1")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Go to step 1" }),
    ).not.toBeInTheDocument()
  })

  it("shows sequence navigation for multi-step timers", () => {
    const onSelectSequenceRow = vi.fn()

    renderTimer({
      onSelectSequenceRow,
      rows: buildRows(),
    })

    expect(
      screen.queryByRole("button", { name: "Previous step" }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Next step" })).toBeVisible()
    expect(screen.getByRole("button", { name: "Step 1" })).toBeVisible()
    expect(screen.getByRole("button", { name: "Step 2: Q&A" })).toBeVisible()

    fireEvent.click(screen.getByRole("button", { name: "Step 2: Q&A" }))

    expect(onSelectSequenceRow).toHaveBeenCalledWith(1)
  })
})
