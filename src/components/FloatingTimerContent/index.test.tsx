import { render, screen } from "@testing-library/react"

import FloatingTimerContent from "./index"

const baseProps = {
  backgroundColor: "#000000",
  elapsedPercentage: 0.35,
  foregroundColor: "#ffffff",
  isTimedOut: false,
  minutes: "12",
  primaryColor: "#d61f69",
  seconds: "34",
}

describe("FloatingTimerContent", () => {
  it("renders floating titles as single-paragraph wrapped text", () => {
    render(<FloatingTimerContent {...baseProps} title="Facilitator notes" />)

    const title = screen.getByTestId("floating-timer-title")
    expect(title).toHaveTextContent("Facilitator")
    expect(title).toHaveTextContent("notes")
  })

  it("uses the short and long floating title class buckets", () => {
    const { rerender } = render(
      <FloatingTimerContent {...baseProps} title="Sprint" />,
    )

    const shortTitle = screen.getByTestId("floating-timer-title")
    expect(shortTitle).toHaveClass("text-3xl")

    rerender(
      <FloatingTimerContent
        {...baseProps}
        title="Quarterly planning retrospective and facilitator notes"
      />,
    )

    const longTitle = screen.getByTestId("floating-timer-title")
    expect(longTitle).toHaveClass("text-2xl")
  })

  it("keeps floating titles unclamped", () => {
    render(
      <FloatingTimerContent
        {...baseProps}
        title="Quarterly planning retrospective and facilitator notes"
      />,
    )

    expect(screen.getByTestId("floating-timer-title")).not.toHaveClass(
      "line-clamp-2",
    )
  })

  it("keeps the title area compact when no title is set", () => {
    render(<FloatingTimerContent {...baseProps} title="" />)

    expect(screen.getByTestId("floating-timer-title")).toBeEmptyDOMElement()
  })
})
