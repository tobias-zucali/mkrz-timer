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
  it("renders multiline titles in the floating timer", () => {
    render(<FloatingTimerContent {...baseProps} title={"Facilitator\nnotes"} />)

    const title = screen.getByTestId("floating-timer-title")
    expect(title).toHaveTextContent("Facilitator")
    expect(title).toHaveTextContent("notes")
  })

  it("scales long titles down before they overflow", () => {
    const { rerender } = render(
      <FloatingTimerContent {...baseProps} title="Sprint" />,
    )

    const shortTitle = screen.getByTestId("floating-timer-title")
    const shortSize = Number.parseFloat(
      shortTitle.parentElement?.style.fontSize ?? "0",
    )

    rerender(
      <FloatingTimerContent
        {...baseProps}
        title={"Quarterly planning\nretrospective and facilitator notes"}
      />,
    )

    const longTitle = screen.getByTestId("floating-timer-title")
    const longSize = Number.parseFloat(
      longTitle.parentElement?.style.fontSize ?? "0",
    )

    expect(longSize).toBeLessThan(shortSize)
  })

  it("keeps the title area compact when no title is set", () => {
    render(<FloatingTimerContent {...baseProps} title="" />)

    expect(screen.getByTestId("floating-timer-title")).toBeEmptyDOMElement()
  })
})
