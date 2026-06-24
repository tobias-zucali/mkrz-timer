import { fireEvent, screen, within } from "@testing-library/react"
import { useState } from "react"

import { DEFAULT_SYNC_PARAMS } from "@/shared/security/input"
import { renderWithIntl } from "@/test/renderWithIntl"

import TimerPanel from "./index"

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
  initialPageTitle = "",
  initialParams,
  onActivateSequenceRow,
  onOpenLoadTimerDialog,
}: {
  initialParams?: typeof DEFAULT_SYNC_PARAMS
  initialPageTitle?: string
  onActivateSequenceRow?: (rowIndex: number) => void
  onOpenLoadTimerDialog?: () => void
}) {
  const [params, setParams] = useState(
    initialParams ?? {
      ...DEFAULT_SYNC_PARAMS,
      rows: [buildRow({ title: "Opening" }), buildRow({ title: "Q&A" })],
    },
  )
  const [pageTitle, setPageTitle] = useState(initialPageTitle)

  return (
    <TimerPanel
      activeIndex={params.activeIndex}
      onActivateSequenceRow={onActivateSequenceRow ?? vi.fn()}
      onOpenLoadTimerDialog={onOpenLoadTimerDialog ?? vi.fn()}
      onPageTitleChange={setPageTitle}
      onSequenceChange={(nextChange) =>
        setParams((currentParams) => ({
          ...currentParams,
          ...nextChange,
        }))
      }
      pageTitle={pageTitle}
      params={params}
    />
  )
}

describe("TimerPanel", () => {
  it("renders and updates the timer name field", () => {
    renderWithIntl(<TimerPanelHarness initialPageTitle="Workshop timer" />)

    const pageTitleField = screen.getByRole("textbox", {
      name: "Timer name",
    })
    pageTitleField.focus()

    fireEvent.change(pageTitleField, {
      target: { value: "Workshop notes" },
    })

    expect(pageTitleField).toHaveValue("Workshop notes")
    expect(pageTitleField).toHaveFocus()
    expect(pageTitleField).toHaveAttribute("title", "Timer name")
  })

  it("keeps the selected step title field focused while typing", () => {
    renderWithIntl(<TimerPanelHarness />)

    const titleField = screen.getByRole("textbox", { name: "Title" })
    titleField.focus()

    fireEvent.change(titleField, {
      target: { value: "Opening notes" },
    })

    expect(titleField).toHaveValue("Opening notes")
    expect(titleField).toHaveFocus()
  })

  it("expands the clicked step for editing", () => {
    renderWithIntl(<TimerPanelHarness />)

    fireEvent.click(screen.getByText("Q&A"))

    expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue("Q&A")
  })

  it("keeps the same step in edit mode while reordering", () => {
    renderWithIntl(<TimerPanelHarness />)

    fireEvent.click(screen.getByText("Q&A"))
    fireEvent.click(screen.getByRole("button", { name: "Move step 2 up" }))

    const titleField = screen.getByRole("textbox", { name: "Title" })

    expect(titleField).toHaveValue("Q&A")
    expect(screen.getByText("Step 1")).toBeVisible()
  })

  it("activates a non-selected step without changing which step is being edited", () => {
    const onActivateSequenceRow = vi.fn()

    renderWithIntl(
      <TimerPanelHarness onActivateSequenceRow={onActivateSequenceRow} />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Make active" }))

    expect(onActivateSequenceRow).toHaveBeenCalledWith(1)
    expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue(
      "Opening",
    )
  })

  it("renders the Load Timer button and calls the callback when clicked", () => {
    const onOpenLoadTimerDialog = vi.fn()

    renderWithIntl(
      <TimerPanelHarness onOpenLoadTimerDialog={onOpenLoadTimerDialog} />,
    )

    const btn = screen.getByRole("button", { name: "Load a timer" })
    expect(btn).toBeVisible()
    fireEvent.click(btn)
    expect(onOpenLoadTimerDialog).toHaveBeenCalledTimes(1)
  })

  it("exposes native spinbuttons and stepper buttons for step timing controls", () => {
    renderWithIntl(<TimerPanelHarness />)

    const minutesStepper = screen.getByRole("group", { name: "Minutes" })
    const secondsStepper = screen.getByRole("group", { name: "Seconds" })

    expect(screen.getByRole("spinbutton", { name: "Minutes" })).toHaveValue(1)
    expect(screen.getByRole("spinbutton", { name: "Seconds" })).toHaveValue(0)
    expect(screen.getByRole("spinbutton", { name: "Repeat" })).toHaveValue(1)
    expect(
      within(minutesStepper).getByRole("button", { name: "Increase" }),
    ).toBeVisible()
    expect(
      within(secondsStepper).getByRole("button", { name: "Decrease" }),
    ).toBeVisible()
  })

  it("keeps arrow-key spinbutton behavior for repetitions", () => {
    renderWithIntl(<TimerPanelHarness />)

    const repeatInput = screen.getByRole("spinbutton", { name: "Repeat" })

    fireEvent.change(repeatInput, { target: { value: "2" } })

    expect(repeatInput).toHaveValue(2)
  })

  it("updates minutes through the stepper buttons", () => {
    renderWithIntl(<TimerPanelHarness />)

    fireEvent.click(
      within(screen.getByRole("group", { name: "Minutes" })).getByRole(
        "button",
        { name: "Increase" },
      ),
    )

    expect(screen.getByRole("spinbutton", { name: "Minutes" })).toHaveValue(2)
    expect(screen.getByRole("spinbutton", { name: "Seconds" })).toHaveValue(0)
  })

  it("keeps stepper buttons out of the tab order", () => {
    renderWithIntl(<TimerPanelHarness />)

    const repetitionsStepper = screen.getByRole("group", {
      name: "Repeat",
    })

    expect(
      within(repetitionsStepper).getByRole("button", { name: "Decrease" }),
    ).toHaveAttribute("tabindex", "-1")
    expect(
      within(repetitionsStepper).getByRole("button", { name: "Increase" }),
    ).toHaveAttribute("tabindex", "-1")
  })
})
