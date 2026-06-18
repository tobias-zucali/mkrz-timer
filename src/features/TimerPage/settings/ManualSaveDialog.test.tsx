import { fireEvent, screen } from "@testing-library/react"

import { renderWithIntl } from "@/test/renderWithIntl"
import useClipboardCopy from "@/utils/useClipboardCopy"

import ManualSaveDialog from "./ManualSaveDialog"

const sampleRows = [
  {
    endBehavior: "stop" as const,
    primaryColor: "#d61f69",
    repeatCount: 1,
    title: "Intro",
    totalSeconds: 60,
  },
  {
    endBehavior: "stop" as const,
    primaryColor: "#d61f69",
    repeatCount: 1,
    title: "",
    totalSeconds: 184,
  },
]

vi.mock("@/utils/useClipboardCopy", () => ({
  default: vi.fn(),
}))

describe("ManualSaveDialog", () => {
  beforeEach(() => {
    vi.mocked(useClipboardCopy).mockReturnValue({
      canCopy: true,
      copyText: vi.fn(),
      isClient: true,
      isCopied: false,
    })
  })

  it("renders a compact export flow with actions", () => {
    renderWithIntl(
      <ManualSaveDialog
        controlClientUrl="http://localhost:3000/en/control/token-1"
        onClose={vi.fn()}
        pageTitle="Workshop"
        readonlyClientUrl="http://localhost:3000/en/view/token-1"
        rows={sampleRows}
        timerUrl="http://localhost:3000/en?v=1&t=60%21d61f69%21%211%210&a=0"
      />,
    )

    expect(screen.getByRole("heading", { name: "Save timer" })).toBeVisible()
    expect(
      screen.getByText(
        "This timer is stored only in your browser. If you want to open it on other devices or keep it permanently, save the following links.",
      ),
    ).toBeVisible()
    expect(screen.getByText("Links to save manually")).toBeVisible()
    expect(screen.getByRole("button", { name: "Copy all" })).toHaveAttribute(
      "title",
      "Copy all",
    )
    expect(screen.getByRole("button", { name: "Download" })).toHaveAttribute(
      "title",
      "Download",
    )
    expect(screen.getByRole("button", { name: "Close" })).toBeVisible()
    expect(screen.getByDisplayValue(/Timer: Workshop/)).toBeVisible()
    expect(screen.getByDisplayValue(/Step 1 \(01:00\): Intro/)).toBeVisible()
    expect(screen.getByDisplayValue(/Step 2 \(03:04\)/)).toBeVisible()
    expect(
      screen.getByDisplayValue(/http:\/\/localhost:3000\/en\/view\/token-1/),
    ).toHaveAttribute("readonly")
  })

  it("selects the export text on focus and click", () => {
    const selectSpy = vi.spyOn(HTMLTextAreaElement.prototype, "select")

    renderWithIntl(
      <ManualSaveDialog
        controlClientUrl=""
        onClose={vi.fn()}
        pageTitle="Workshop"
        readonlyClientUrl=""
        rows={sampleRows}
        timerUrl="http://localhost:3000/en?v=1&t=60%21d61f69%21%211%210&a=0"
      />,
    )

    const exportField = screen.getByRole("textbox", {
      name: "Links to save manually",
    })

    fireEvent.focus(exportField)
    fireEvent.click(exportField)

    expect(selectSpy).toHaveBeenCalledTimes(2)
    selectSpy.mockRestore()
  })

  it("omits viewer and control links when unavailable", () => {
    renderWithIntl(
      <ManualSaveDialog
        controlClientUrl=""
        onClose={vi.fn()}
        pageTitle="Workshop"
        readonlyClientUrl=""
        rows={[
          {
            ...sampleRows[0],
            title: "",
          },
        ]}
        timerUrl="http://localhost:3000/en?v=1&t=60%21d61f69%21%211%210&a=0"
      />,
    )

    const exportField = screen.getByRole("textbox", {
      name: "Links to save manually",
    })

    expect(exportField).toHaveDisplayValue(
      "Timer: Workshop\nStep 1 (01:00)\nhttp://localhost:3000/en?v=1&t=60%21d61f69%21%211%210&a=0",
    )
  })
})
