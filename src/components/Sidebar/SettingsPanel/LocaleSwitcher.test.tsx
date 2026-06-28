import { act, fireEvent, screen } from "@testing-library/react"

import { renderWithIntl } from "@/test/renderWithIntl"

import LocaleSwitcher from "./LocaleSwitcher"

describe("LocaleSwitcher", () => {
  it("shows locale options and switches locale without navigation", () => {
    renderWithIntl(<LocaleSwitcher />)

    expect(screen.getByRole("button", { name: "English" })).toBeInTheDocument()
    const deButton = screen.getByRole("button", { name: "Deutsch" })

    act(() => {
      fireEvent.click(deButton)
    })

    expect(screen.getByRole("button", { name: "Deutsch" })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe("de")
  })
})
