import { fireEvent, render, screen } from "@testing-library/react"

import ColorSwatchField from "./index"

describe("ColorSwatchField", () => {
  it("renders the label, value, and color input", () => {
    render(
      <ColorSwatchField
        id="theme-primary"
        label="Primary"
        onChange={() => undefined}
        value="#112233"
      />,
    )

    expect(screen.getByLabelText("Primary")).toHaveValue("#112233")
    expect(screen.getByText("#112233")).toBeInTheDocument()
  })

  it("forwards color changes and stops key propagation", () => {
    const handleChange = vi.fn()
    const onKeyDown = vi.fn()
    const onKeyUp = vi.fn()

    render(
      <div onKeyDown={onKeyDown} onKeyUp={onKeyUp}>
        <ColorSwatchField
          id="theme-foreground"
          label="Foreground"
          onChange={handleChange}
          value="#abcdef"
        />
      </div>,
    )

    const input = screen.getByLabelText("Foreground")

    fireEvent.change(input, { target: { value: "#fedcba" } })
    fireEvent.keyDown(input, { key: "Enter" })
    fireEvent.keyUp(input, { key: "Enter" })

    expect(handleChange).toHaveBeenCalledTimes(1)
    expect(onKeyDown).not.toHaveBeenCalled()
    expect(onKeyUp).not.toHaveBeenCalled()
  })
})
