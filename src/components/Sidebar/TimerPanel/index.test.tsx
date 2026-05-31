import { fireEvent, screen } from "@testing-library/react"
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
  initialParams,
  initialPageTitle = "",
  onActivateSequenceRow,
}: {
  initialParams?: typeof DEFAULT_SYNC_PARAMS
  initialPageTitle?: string
  onActivateSequenceRow?: (rowIndex: number) => void
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
  it("renders and updates the optional page title", () => {
    renderWithIntl(<TimerPanelHarness initialPageTitle="Workshop timer" />)

    const pageTitleField = screen.getByRole("textbox", {
      name: "Page heading",
    })
    pageTitleField.focus()

    fireEvent.change(pageTitleField, {
      target: { value: "Workshop notes" },
    })

    expect(pageTitleField).toHaveValue("Workshop notes")
    expect(pageTitleField).toHaveFocus()
  })

  it("keeps the title field focused while typing", () => {
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
})
