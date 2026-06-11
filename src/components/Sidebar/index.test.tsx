import { screen, within } from "@testing-library/react"

import {
  DEFAULT_SYNC_PARAMS,
  normalizeQueryParams,
} from "@/shared/security/input"
import { renderWithIntl } from "@/test/renderWithIntl"
import type { FloatingTimerData } from "@/utils/useFloatingTimerPiP"

import Sidebar from "./index"

const infoPageContents = {
  about: {
    body: "# About mkrz timer\n\nAbout body",
    description: "About description",
    requestedLocale: "en" as const,
    resolvedLocale: "en" as const,
    slug: "about" as const,
    title: "About mkrz timer",
  },
  privacy: {
    body: "# Privacy\n\nPrivacy body",
    description: "Privacy description",
    requestedLocale: "en" as const,
    resolvedLocale: "en" as const,
    slug: "privacy" as const,
    title: "Privacy",
  },
  impressum: {
    body: "# Impressum\n\nImpressum body",
    description: "Impressum description",
    requestedLocale: "en" as const,
    resolvedLocale: "en" as const,
    slug: "impressum" as const,
    title: "Impressum",
  },
  terms: {
    body: "# Terms\n\nTerms body",
    description: "Terms description",
    requestedLocale: "en" as const,
    resolvedLocale: "en" as const,
    slug: "terms" as const,
    title: "Terms",
  },
  accessibility: {
    body: "# Accessibility\n\nAccessibility body",
    description: "Accessibility description",
    requestedLocale: "en" as const,
    resolvedLocale: "en" as const,
    slug: "accessibility" as const,
    title: "Accessibility",
  },
  contact: {
    body: "# Contact\n\nContact body",
    description: "Contact description",
    requestedLocale: "en" as const,
    resolvedLocale: "en" as const,
    slug: "contact" as const,
    title: "Contact",
  },
}

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
    hasTimerChanges: false,
    currentEntryId: null,
    onActivateSequenceRow: vi.fn(),
    onDuplicateCurrentTimer: vi.fn(),
    onNewTimer: vi.fn(),
    onOpenLoadRecentDialog: vi.fn(),
    onPageTitleChange: vi.fn(),
    onOpenSaveDialog: vi.fn(),
    onSequenceChange: vi.fn(),
    pageTitle,
    params: normalizeQueryParams(DEFAULT_SYNC_PARAMS),
    storedTimerCount: 0,
  }
}

const baseProps = {
  infoPageContents,
  settingsPanel: {
    floatingTimerData: {
      isOpen: false,
      isSupported: true,
      toggle: vi.fn(async () => undefined),
      unsupportedReason: null,
    } satisfies FloatingTimerData,
    handleChange: vi.fn(),
    params: {
      bg: DEFAULT_SYNC_PARAMS.bg,
      fg: DEFAULT_SYNC_PARAMS.fg,
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

    expect(
      screen.getByRole("checkbox", { name: /Voice announcements/ }),
    ).toBeVisible()
    expect(screen.getByLabelText("Sound when finished")).toBeVisible()
    expect(screen.getByRole("button", { name: "Preview sound" })).toBeVisible()
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

  it("renders informational entries and opens their panel content", () => {
    renderWithIntl(
      <Sidebar
        {...baseProps}
        shell={{ ...baseProps.shell, selectedEntryId: "about" }}
      />,
    )

    expect(screen.getByRole("button", { name: "About" })).toBeVisible()
    expect(screen.getByRole("button", { name: "Privacy" })).toBeVisible()
    expect(screen.getByRole("button", { name: "Accessibility" })).toBeVisible()
    expect(
      within(screen.getByTestId("sidebar-panel-about")).getByText("About body"),
    ).toBeVisible()
  })
})
