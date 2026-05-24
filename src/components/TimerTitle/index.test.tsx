import { fireEvent, screen } from "@testing-library/react"

import { renderWithIntl } from "@/test/renderWithIntl"

import TimerTitle from "./index"

describe("TimerTitle", () => {
  it("shows an explicit add action while keeping the textarea available", () => {
    renderWithIntl(<TimerTitle onChange={() => undefined} value="" />)

    expect(screen.getByRole("button", { name: "Add title" })).toBeVisible()
    expect(screen.getByLabelText("Title")).toBeInTheDocument()
  })

  it("enters multiline editing on demand and enforces the title length limit", () => {
    renderWithIntl(<TimerTitle onChange={() => undefined} value="" />)

    fireEvent.click(screen.getByRole("button", { name: "Add title" }))

    const editor = screen.getByLabelText("Title")
    expect(editor).toHaveFocus()
    expect(editor).toHaveAttribute("maxlength", "64")
    expect(editor.tagName).toBe("TEXTAREA")
  })

  it("renders multiline titles and scales long titles down", () => {
    const { unmount } = renderWithIntl(
      <TimerTitle onChange={() => undefined} value={"Sprint\nreview"} />,
    )

    const shortTitle = screen.getByLabelText("Title")
    expect(shortTitle).toHaveValue("Sprint\nreview")
    const shortSize = Number.parseFloat(
      (shortTitle as HTMLTextAreaElement).style.fontSize,
    )

    unmount()

    renderWithIntl(
      <TimerTitle
        onChange={() => undefined}
        value={"Quarterly planning\nretrospective and facilitator notes"}
      />,
    )

    const longTitle = screen.getByLabelText("Title")
    const longSize = Number.parseFloat(
      (longTitle as HTMLTextAreaElement).style.fontSize,
    )

    expect(longSize).toBeLessThan(shortSize)
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
