import { fireEvent, screen } from "@testing-library/react"
import { vi } from "vitest"

import { renderWithIntl } from "@/test/renderWithIntl"

import TimerTitle from "./index"

describe("TimerTitle", () => {
  it("shows an explicit add action while keeping the textarea available", () => {
    renderWithIntl(<TimerTitle onChange={() => undefined} value="" />)

    expect(screen.getByRole("button", { name: "Add title" })).toBeVisible()
    expect(screen.getByLabelText("Title")).toBeInTheDocument()
  })

  it("enters title editing on demand and enforces the title length limit", () => {
    renderWithIntl(<TimerTitle onChange={() => undefined} value="" />)

    fireEvent.click(screen.getByRole("button", { name: "Add title" }))

    const editor = screen.getByLabelText("Title")
    expect(editor).toHaveFocus()
    expect(editor).toHaveAttribute("maxlength", "64")
    expect(editor.tagName).toBe("TEXTAREA")
  })

  it("uses the short and long title class buckets in display mode", () => {
    const { unmount } = renderWithIntl(
      <TimerTitle onChange={() => undefined} value="Sprint review" />,
    )

    expect(screen.getByTestId("timer-title-text")).toHaveClass("text-5xl")

    unmount()

    renderWithIntl(
      <TimerTitle
        onChange={() => undefined}
        value="Quarterly planning retrospective and facilitator notes"
      />,
    )

    expect(screen.getByTestId("timer-title-text")).toHaveClass("text-4xl")
  })

  it("normalizes typed and pasted line breaks into spaces", () => {
    const handleChange = vi.fn()
    renderWithIntl(<TimerTitle onChange={handleChange} value="Sprint" />)

    const editor = screen.getByLabelText("Title")
    fireEvent.focus(editor)
    fireEvent.change(editor, {
      target: { value: "Sprint\nreview" },
    })
    expect(handleChange).toHaveBeenLastCalledWith("Sprint review")

    const textarea = editor as HTMLTextAreaElement
    textarea.setSelectionRange(0, textarea.value.length)
    fireEvent.paste(editor, {
      clipboardData: {
        getData: () => "Retro\nnotes",
      },
    })
    expect(handleChange).toHaveBeenLastCalledWith("Retro notes")
  })

  it("prevents enter from inserting a line break", () => {
    renderWithIntl(<TimerTitle onChange={() => undefined} value="Sprint" />)

    const editor = screen.getByLabelText("Title")
    fireEvent.focus(editor)

    const keyDownEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Enter",
    })

    editor.dispatchEvent(keyDownEvent)

    expect(keyDownEvent.defaultPrevented).toBe(true)
  })

  it("keeps long non-editing titles unclamped", () => {
    renderWithIntl(
      <TimerTitle
        onChange={() => undefined}
        value="Quarterly planning retrospective and facilitator notes"
      />,
    )

    expect(screen.getByTestId("timer-title-text")).not.toHaveClass(
      "line-clamp-2",
    )
  })

  it("keeps readonly empty titles collapsed", () => {
    renderWithIntl(<TimerTitle disabled onChange={() => undefined} value="" />)

    expect(screen.getByTestId("timer-title")).toHaveAttribute(
      "data-title-empty",
      "true",
    )
    expect(
      screen.queryByRole("button", { name: "Add title" }),
    ).not.toBeInTheDocument()
  })
})
