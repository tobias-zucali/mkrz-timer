import { fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"

import { DEFAULT_SYNC_PARAMS } from "@/shared/security/input"

import TimerPanel from "./TimerPanel"

function buildRow({
  endBehavior = "stop",
  primaryColor = "#d61f69",
  repeatCount = 1,
  title,
  totalSeconds = 60,
}: {
  endBehavior?: "advance" | "stop"
  primaryColor?: string
  repeatCount?: number
  title: string
  totalSeconds?: number
}) {
  return {
    endBehavior,
    primaryColor,
    repeatCount,
    title,
    totalSeconds,
  }
}

function TimerPanelHarness({
  initialParams,
  onActivateSequenceRow,
}: {
  initialParams?: typeof DEFAULT_SYNC_PARAMS
  onActivateSequenceRow?: (rowIndex: number) => void
}) {
  const [params, setParams] = useState(
    initialParams ?? {
      ...DEFAULT_SYNC_PARAMS,
      rows: [buildRow({ title: "Opening" }), buildRow({ title: "Q&A" })],
    },
  )

  return (
    <TimerPanel
      activeIndex={params.activeIndex}
      onActivateSequenceRow={onActivateSequenceRow ?? vi.fn()}
      onSequenceChange={(nextChange) =>
        setParams((currentParams) => ({
          ...currentParams,
          ...nextChange,
        }))
      }
      params={params}
    />
  )
}

describe("TimerPanel", () => {
  it("keeps the title field focused while typing", () => {
    render(<TimerPanelHarness />)

    const titleField = screen.getByRole("textbox", { name: "Title" })
    titleField.focus()

    fireEvent.change(titleField, {
      target: { value: "Opening notes" },
    })

    expect(titleField).toHaveValue("Opening notes")
    expect(titleField).toHaveFocus()
  })

  it("expands the clicked step for editing", () => {
    render(<TimerPanelHarness />)

    fireEvent.click(screen.getByText("Q&A"))

    expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue("Q&A")
  })

  it("keeps the same step in edit mode while reordering", () => {
    render(<TimerPanelHarness />)

    fireEvent.click(screen.getByText("Q&A"))
    fireEvent.click(screen.getByRole("button", { name: "Move step 2 up" }))

    const titleField = screen.getByRole("textbox", { name: "Title" })

    expect(titleField).toHaveValue("Q&A")
    expect(screen.getByText("Step 1")).toBeVisible()
  })

  it("activates a non-selected step without changing which step is being edited", () => {
    const onActivateSequenceRow = vi.fn()

    render(<TimerPanelHarness onActivateSequenceRow={onActivateSequenceRow} />)

    fireEvent.click(screen.getByRole("button", { name: "Make Active" }))

    expect(onActivateSequenceRow).toHaveBeenCalledWith(1)
    expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue(
      "Opening",
    )
  })
})
