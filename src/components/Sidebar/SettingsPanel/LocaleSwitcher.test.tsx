import { fireEvent, screen } from "@testing-library/react"

import { renderWithIntl } from "@/test/renderWithIntl"

import LocaleSwitcher from "./LocaleSwitcher"

const replace = vi.fn()

vi.mock("next/navigation", () => ({
  usePathname: () => "/en/view/viewer-token",
  useRouter: () => ({
    replace,
  }),
  useSearchParams: () => new URLSearchParams("title=Workshop&v=1"),
}))

describe("LocaleSwitcher", () => {
  beforeEach(() => {
    replace.mockReset()
  })

  it("shows the active locale and rewrites the current path", () => {
    renderWithIntl(<LocaleSwitcher />)

    const localeField = screen.getByRole("combobox", { name: "Language" })

    expect(localeField).toHaveValue("en")

    fireEvent.change(localeField, {
      target: { value: "de" },
    })

    expect(replace).toHaveBeenCalledWith(
      "/de/view/viewer-token?title=Workshop&v=1",
    )
  })
})
