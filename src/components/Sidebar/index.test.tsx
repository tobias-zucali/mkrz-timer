import { screen } from "@testing-library/react"

import {
  DEFAULT_SYNC_PARAMS,
  normalizeQueryParams,
} from "@/shared/security/input"
import { renderWithIntl } from "@/test/renderWithIntl"
import type { FloatingTimerData } from "@/utils/useFloatingTimerPiP"

import Sidebar from "./index"

vi.mock("next/navigation", () => ({
  usePathname: () => "/en",
  useRouter: () => ({
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}))

function buildTimerPanel(pageTitle = "") {
  return {
    activeIndex: 0,
    onActivateSequenceRow: vi.fn(),
    onOpenLoadTimerDialog: vi.fn(),
    onPageTitleChange: vi.fn(),
    onSequenceChange: vi.fn(),
    pageTitle,
    params: normalizeQueryParams(DEFAULT_SYNC_PARAMS),
  }
}

const baseProps = {
  locale: "en" as const,
  settingsPanel: {
    floatingTimerData: {
      isOpen: false,
      isSupported: true,
      toggle: vi.fn(async () => undefined),
      unsupportedReason: null,
    } satisfies FloatingTimerData,
    handleChange: vi.fn(),
    params: {
      theme: DEFAULT_SYNC_PARAMS.theme,
      snd: DEFAULT_SYNC_PARAMS.snd,
      tts: DEFAULT_SYNC_PARAMS.tts,
    },
  },
  sharePanel: {
    panelProps: {
      accessTokens: undefined,
      controlClientUrl: "",
      includeSettingsInLinks: true,
      onEndRemoteSession: vi.fn(async () => undefined),
      onIncludeSettingsInLinksChange: vi.fn(),
      onStartRemoteSession: vi.fn(async () => undefined),
      readonlyClientUrl: "",
      timerUrl: "http://localhost:3000/",
    },
    remoteRole: null,
  },
  shell: {
    isPinnedOpen: true,
    selectedEntryId: null,
    setIsPinnedOpen: vi.fn(),
    setSelectedEntryId: vi.fn(),
  },
  statusPanelData: {
    activityLog: [],
    connectionDetails: [],
    errorText: null,
    floatingTimerErrorText: null,
    getErrorReportBody: vi.fn(() => ""),
    isOnline: true,
    isRetrying: false,
    localClientId: "client-1",
    onRetry: vi.fn(),
    participants: [],
    relayLabel: "Relay",
    relayReachability: "reachable" as const,
    sessionPresentation: {
      accessibilityLabel: "Private session",
      isWaitingForController: false,
      roleChipLabel: null,
      runtimeBadgeLabel: "Private",
      sharePanel: {
        bullets: [],
        description: "",
        endActionLabel: "",
        primaryActionLabel: null,
        showLinks: false,
        showRetry: false,
        statusLabel: null,
        tone: "neutral" as const,
      },
      sidebarStatus: {
        eyebrow: "LOCAL",
        label: "Private session",
      },
      state: "local" as const,
      statusPanel: {
        accessLabel: "",
        description: "",
        sessionLabel: "",
        stateLabel: "",
        summaryLabel: "",
      },
    },
  },
  timerPanel: buildTimerPanel(),
}

describe("Sidebar", () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      addEventListener: vi.fn(),
      matches: false,
      media: "",
      removeEventListener: vi.fn(),
    }))
  })

  it("shows the page title instead of the timer label when present", () => {
    renderWithIntl(
      <Sidebar {...baseProps} timerPanel={buildTimerPanel("Workshop timer")} />,
    )

    expect(screen.getByRole("button", { name: "Workshop timer" })).toBeVisible()
  })

  it("falls back to the localized timer label when no page title is set", () => {
    renderWithIntl(<Sidebar {...baseProps} timerPanel={buildTimerPanel()} />)

    expect(screen.getByRole("button", { name: "Timer" })).toBeVisible()
  })

  it("renders the new settings controls", () => {
    renderWithIntl(
      <Sidebar
        {...baseProps}
        shell={{ ...baseProps.shell, selectedEntryId: "settings" }}
      />,
    )

    expect(screen.getByLabelText("Announcements")).toBeVisible()
    expect(screen.getByLabelText("Finish sound")).toBeVisible()
    expect(screen.getByRole("button", { name: "Preview" })).toBeVisible()
  })

  it("renders the share settings toggle", () => {
    renderWithIntl(
      <Sidebar
        {...baseProps}
        shell={{ ...baseProps.shell, selectedEntryId: "share" }}
      />,
    )

    expect(
      screen.getByRole("checkbox", {
        name: /Include Voice & Sound settings in links/,
      }),
    ).toBeVisible()
  })

  it("links the sidebar heading back to the public home page", () => {
    renderWithIntl(<Sidebar {...baseProps} />)

    expect(screen.getByRole("link", { name: "mkrz timer" })).toHaveAttribute(
      "href",
      "/en",
    )
  })
})
