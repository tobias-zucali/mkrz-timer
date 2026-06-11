import { render, screen } from "@testing-library/react"

import FloatingTimerContent from "./index"

const baseProps = {
  accessibleTimerText: "View only. Remaining time. 12 minutes, 34 seconds.",
  backgroundColor: "#000000",
  elapsedPercentage: 0.35,
  foregroundColor: "#ffffff",
  isTimedOut: false,
  minutes: "12",
  primaryColor: "#d61f69",
  seconds: "34",
}

describe("FloatingTimerContent", () => {
  it("exposes the floating timer readout semantically", () => {
    render(<FloatingTimerContent {...baseProps} title="Facilitator notes" />)

    expect(
      screen.getByRole("timer", {
        name: "View only. Remaining time. 12 minutes, 34 seconds.",
      }),
    ).toBeInTheDocument()
  })

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
    expect(shortTitle).toHaveStyle({
      fontSize: "clamp(2.4rem, min(6.8vw, 6.8vh), 4.5rem)",
    })

    rerender(
      <FloatingTimerContent
        {...baseProps}
        title="Quarterly planning retrospective and facilitator notes"
      />,
    )

    const longTitle = screen.getByTestId("floating-timer-title")
    expect(longTitle).toHaveStyle({
      fontSize: "clamp(2rem, min(5.8vw, 5.8vh), 3.75rem)",
    })
  })

  it("keeps floating titles fully visible", () => {
    render(
      <FloatingTimerContent
        {...baseProps}
        title="Quarterly planning retrospective and facilitator notes"
      />,
    )

    expect(
      screen.getByTestId("floating-timer-title").getAttribute("style"),
    ).not.toContain("max-height")
  })

  it("keeps the title area compact when no title is set", () => {
    render(<FloatingTimerContent {...baseProps} title="" />)

    expect(screen.getByTestId("floating-timer-title")).toBeEmptyDOMElement()
  })
})
