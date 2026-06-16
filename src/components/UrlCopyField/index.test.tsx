import { fireEvent, screen } from "@testing-library/react"

import { renderWithIntl } from "@/test/renderWithIntl"

import UrlCopyField, { openUrlInNewContext } from "./index"

describe("UrlCopyField", () => {
  it("opens URLs through a fresh browsing context without replacing the app", () => {
    const replace = vi.fn()
    const openedWindow = {
      location: { replace },
      opener: window,
    }
    const open = vi
      .spyOn(window, "open")
      .mockReturnValue(openedWindow as unknown as Window)

    renderWithIntl(
      <UrlCopyField
        label="Viewer link"
        showOpenButton={true}
        value="https://example.com/view"
      />,
    )

    fireEvent.click(screen.getByRole("link", { name: "Open URL" }))

    expect(open).toHaveBeenCalledWith("", "_blank")
    expect(openedWindow.opener).toBeNull()
    expect(replace).toHaveBeenCalledWith("https://example.com/view")
  })

  it("reports when the browser blocks the new browsing context", () => {
    vi.spyOn(window, "open").mockReturnValue(null)

    expect(openUrlInNewContext("https://example.com/view")).toBe(false)
  })
})
