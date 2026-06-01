import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { defaultAppLocale } from "@/i18n/config"
import { getMessagesForLocale } from "@/i18n/messages"

import TopRightControls from "./index"

vi.mock("@/utils/timerPage/useFullscreenState", () => ({
  default: () => ({
    isFullscreen: false,
    isFullscreenSupported: true,
    toggleFullscreen: vi.fn(),
  }),
}))

const messages = getMessagesForLocale(defaultAppLocale)

const baseProps = {
  floatingTimerData: {
    isOpen: false,
    isSupported: true,
    toggle: vi.fn().mockResolvedValue(undefined),
  },
  isDimmed: false,
  isReadonlyClient: false,
  isSharePanelOpen: false,
  onOpenSharePanel: vi.fn(),
  sidebarOffcanvasId: "sidebar-panel",
}

function renderComponent(
  overrides: Partial<Parameters<typeof TopRightControls>[0]> = {},
) {
  return render(
    <NextIntlClientProvider locale={defaultAppLocale} messages={messages}>
      <TopRightControls {...baseProps} {...overrides} />
    </NextIntlClientProvider>,
  )
}

describe("TopRightControls", () => {
  it("keeps the top-right control cluster mounted while dimmed", () => {
    renderComponent({ isDimmed: true })

    const controls = screen.getByTestId("top-right-controls")
    expect(controls).toBeInTheDocument()
    expect(controls).toHaveAttribute("data-dimmed", "true")
    expect(controls.className).not.toContain("hidden")
    expect(controls.className).toContain("timer-chrome-dimmed")
    expect(controls.className).toContain("timer-chrome-transition")
  })

  it("renders the full-opacity state without changing button availability", () => {
    renderComponent({ isDimmed: false })

    const controls = screen.getByTestId("top-right-controls")
    expect(controls).toHaveAttribute("data-dimmed", "false")
    expect(controls.className).toContain("opacity-100")
    expect(screen.getByRole("button", { name: "Open sharing" })).toBeEnabled()
  })
})
