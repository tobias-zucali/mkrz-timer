import { screen } from "@testing-library/react"

import {
  DEFAULT_SYNC_PARAMS,
  normalizeQueryParams,
} from "@/shared/security/input"
import { renderWithIntl } from "@/test/renderWithIntl"
import type useParams from "@/utils/useParams"
import type useRemoteSession from "@/utils/remoteSession"
import type { FloatingTimerData } from "@/utils/useFloatingTimerPiP"

import Sidebar from "./index"

function buildParamData(pageTitle = "") {
  return {
    getPathWithParams: vi.fn(() => "/"),
    getUrlWithParams: vi.fn(() => "http://localhost:3000/"),
    isSearchParamsEmpty: false,
    pageTitle,
    params: normalizeQueryParams(DEFAULT_SYNC_PARAMS),
    parsedTimerUrlState: {
      activeIndex: 0,
      bg: DEFAULT_SYNC_PARAMS.bg,
      fg: DEFAULT_SYNC_PARAMS.fg,
      hasTimerState: false,
      rows: [],
      version: null,
    },
    readTimerUrlState: vi.fn(),
    setPageTitle: vi.fn(),
    setParams: vi.fn(),
  } satisfies ReturnType<typeof useParams>
}

const baseProps = {
  activeIndex: 0,
  floatingTimerData: {
    isOpen: false,
    isSupported: true,
    toggle: vi.fn(async () => undefined),
    unsupportedReason: null,
  } satisfies FloatingTimerData,
  handleChange: vi.fn(),
  isPinnedOpen: true,
  onActivateSequenceRow: vi.fn(),
  onEndRemoteSession: vi.fn(async () => undefined),
  onSequenceChange: vi.fn(),
  onStartRemoteSession: vi.fn(async () => undefined),
  peerData: {
    accessTokens: undefined,
  } as unknown as ReturnType<typeof useRemoteSession>,
  remoteRole: null,
  selectedEntryId: null,
  setIsPinnedOpen: vi.fn(),
  setSelectedEntryId: vi.fn(),
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
      <Sidebar {...baseProps} paramData={buildParamData("Workshop timer")} />,
    )

    expect(screen.getByRole("button", { name: "Workshop timer" })).toBeVisible()
  })

  it("falls back to the localized timer label when no page title is set", () => {
    renderWithIntl(<Sidebar {...baseProps} paramData={buildParamData()} />)

    expect(screen.getByRole("button", { name: "Timer" })).toBeVisible()
  })
})
