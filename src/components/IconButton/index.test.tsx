import { createRef } from "react"
import { fireEvent, render, screen } from "@testing-library/react"

import IconButton from "./index"

describe("IconButton", () => {
  it("uses the title as the fallback accessible name and defaults to a button type", () => {
    render(
      <IconButton title="Open menu">
        <span aria-hidden="true">+</span>
      </IconButton>,
    )

    const button = screen.getByRole("button", { name: "Open menu" })

    expect(button).toHaveAttribute("title", "Open menu")
    expect(button).toHaveAttribute("type", "button")
  })

  it("supports the nav ghost variant used by timer chrome controls", () => {
    render(
      <IconButton
        aria-expanded={true}
        aria-pressed={true}
        appearance="ghost"
        isActive={true}
        onClick={() => undefined}
        shape="soft"
        size="nav"
        title="Toggle navigation"
      >
        <span aria-hidden="true">#</span>
      </IconButton>,
    )

    const button = screen.getByRole("button", { name: "Toggle navigation" })

    expect(button).toHaveAttribute("aria-expanded", "true")
    expect(button).toHaveAttribute("aria-pressed", "true")
  })

  it("prefers an explicit aria-label and forwards button props", () => {
    const handleClick = vi.fn()

    render(
      <IconButton
        aria-label="Dismiss panel"
        disabled={true}
        onClick={handleClick}
        title="Close"
      >
        <span aria-hidden="true">x</span>
      </IconButton>,
    )

    const button = screen.getByRole("button", { name: "Dismiss panel" })
    fireEvent.click(button)

    expect(button).toBeDisabled()
    expect(handleClick).not.toHaveBeenCalled()
  })

  it("forwards refs to the underlying button element", () => {
    const ref = createRef<HTMLButtonElement>()

    render(
      <IconButton ref={ref} title="Focus timer action">
        <span aria-hidden="true">*</span>
      </IconButton>,
    )

    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
    expect(ref.current).toBe(
      screen.getByRole("button", { name: "Focus timer action" }),
    )
  })

  it("preserves caller class names for local styling overrides", () => {
    render(
      <IconButton className="mt-1" title="Styled action">
        <span aria-hidden="true">@</span>
      </IconButton>,
    )

    expect(screen.getByRole("button", { name: "Styled action" })).toHaveClass(
      "mt-1",
    )
  })
})
