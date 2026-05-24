import type { AppLocale } from "@/i18n/config"

import closeButtonEnMessages from "./CloseButton/messages/en.json" with { type: "json" }
import developerReportDialogEnMessages from "./DeveloperReportDialog/messages/en.json" with { type: "json" }
import digitalDisplayEnMessages from "./DigitalDisplay/messages/en.json" with { type: "json" }
import helpTextEnMessages from "./HelpText/messages/en.json" with { type: "json" }
import qrCodeOverlayEnMessages from "./QrCodeOverlay/messages/en.json" with { type: "json" }
import sidebarEnMessages from "./Sidebar/messages/en.json" with { type: "json" }
import participantSummaryEnMessages from "./Sidebar/participantSummary/messages/en.json" with { type: "json" }
import settingsPanelEnMessages from "./Sidebar/SettingsPanel/messages/en.json" with { type: "json" }
import sharePanelEnMessages from "./Sidebar/SharePanel/messages/en.json" with { type: "json" }
import statusPanelEnMessages from "./Sidebar/StatusPanel/messages/en.json" with { type: "json" }
import timerPanelEnMessages from "./Sidebar/TimerPanel/messages/en.json" with { type: "json" }
import statusBadgeEnMessages from "./StatusBadge/messages/en.json" with { type: "json" }
import syncConflictDialogEnMessages from "./SyncConflictDialog/messages/en.json" with { type: "json" }
import timerEnMessages from "./Timer/messages/en.json" with { type: "json" }
import topRightControlsEnMessages from "./TimerPageTopRightControls/messages/en.json" with { type: "json" }
import timerTitleEnMessages from "./TimerTitle/messages/en.json" with { type: "json" }
import urlCopyFieldEnMessages from "./UrlCopyField/messages/en.json" with { type: "json" }

export const componentMessagesByLocale = {
  en: {
    CloseButton: closeButtonEnMessages,
    DeveloperReportDialog: developerReportDialogEnMessages,
    DigitalDisplay: digitalDisplayEnMessages,
    HelpText: helpTextEnMessages,
    QrCodeOverlay: qrCodeOverlayEnMessages,
    Sidebar: {
      ...sidebarEnMessages,
      participantSummary: participantSummaryEnMessages,
      settings: settingsPanelEnMessages,
      share: sharePanelEnMessages,
      status: statusPanelEnMessages,
      timer: timerPanelEnMessages,
    },
    StatusBadge: statusBadgeEnMessages,
    SyncConflictDialog: syncConflictDialogEnMessages,
    Timer: timerEnMessages,
    TimerTitle: timerTitleEnMessages,
    TopRightControls: topRightControlsEnMessages,
    UrlCopyField: urlCopyFieldEnMessages,
  },
} as const satisfies Record<AppLocale, object>
