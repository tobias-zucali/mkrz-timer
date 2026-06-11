import type { AppLocale } from "@/i18n/config"

import closeButtonEnMessages from "./CloseButton/messages/en.json" with { type: "json" }
import closeButtonDeMessages from "./CloseButton/messages/de.json" with { type: "json" }
import developerReportDialogEnMessages from "./DeveloperReportDialog/messages/en.json" with { type: "json" }
import developerReportDialogDeMessages from "./DeveloperReportDialog/messages/de.json" with { type: "json" }
import digitalDisplayEnMessages from "./DigitalDisplay/messages/en.json" with { type: "json" }
import digitalDisplayDeMessages from "./DigitalDisplay/messages/de.json" with { type: "json" }
import helpTextEnMessages from "./HelpText/messages/en.json" with { type: "json" }
import helpTextDeMessages from "./HelpText/messages/de.json" with { type: "json" }
import qrCodeOverlayEnMessages from "./QrCodeOverlay/messages/en.json" with { type: "json" }
import qrCodeOverlayDeMessages from "./QrCodeOverlay/messages/de.json" with { type: "json" }
import sidebarEnMessages from "./Sidebar/messages/en.json" with { type: "json" }
import sidebarDeMessages from "./Sidebar/messages/de.json" with { type: "json" }
import participantSummaryEnMessages from "./Sidebar/participantSummary/messages/en.json" with { type: "json" }
import participantSummaryDeMessages from "./Sidebar/participantSummary/messages/de.json" with { type: "json" }
import settingsPanelEnMessages from "./Sidebar/SettingsPanel/messages/en.json" with { type: "json" }
import settingsPanelDeMessages from "./Sidebar/SettingsPanel/messages/de.json" with { type: "json" }
import sharePanelEnMessages from "./Sidebar/SharePanel/messages/en.json" with { type: "json" }
import sharePanelDeMessages from "./Sidebar/SharePanel/messages/de.json" with { type: "json" }
import statusPanelEnMessages from "./Sidebar/StatusPanel/messages/en.json" with { type: "json" }
import statusPanelDeMessages from "./Sidebar/StatusPanel/messages/de.json" with { type: "json" }
import timerPanelEnMessages from "./Sidebar/TimerPanel/messages/en.json" with { type: "json" }
import timerPanelDeMessages from "./Sidebar/TimerPanel/messages/de.json" with { type: "json" }
import timerSequenceInspectorEnMessages from "./Sidebar/TimerSequenceInspector/messages/en.json" with { type: "json" }
import timerSequenceInspectorDeMessages from "./Sidebar/TimerSequenceInspector/messages/de.json" with { type: "json" }
import statusBadgeEnMessages from "./StatusBadge/messages/en.json" with { type: "json" }
import statusBadgeDeMessages from "./StatusBadge/messages/de.json" with { type: "json" }
import syncConflictDialogEnMessages from "./SyncConflictDialog/messages/en.json" with { type: "json" }
import syncConflictDialogDeMessages from "./SyncConflictDialog/messages/de.json" with { type: "json" }
import timerEnMessages from "./Timer/messages/en.json" with { type: "json" }
import timerDeMessages from "./Timer/messages/de.json" with { type: "json" }
import topRightControlsEnMessages from "./TimerPageTopRightControls/messages/en.json" with { type: "json" }
import topRightControlsDeMessages from "./TimerPageTopRightControls/messages/de.json" with { type: "json" }
import timerTitleEnMessages from "./TimerTitle/messages/en.json" with { type: "json" }
import timerTitleDeMessages from "./TimerTitle/messages/de.json" with { type: "json" }
import urlCopyFieldEnMessages from "./UrlCopyField/messages/en.json" with { type: "json" }
import urlCopyFieldDeMessages from "./UrlCopyField/messages/de.json" with { type: "json" }

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
      timerSequenceInspector: timerSequenceInspectorEnMessages,
    },
    StatusBadge: statusBadgeEnMessages,
    SyncConflictDialog: syncConflictDialogEnMessages,
    Timer: timerEnMessages,
    TimerTitle: timerTitleEnMessages,
    TopRightControls: topRightControlsEnMessages,
    UrlCopyField: urlCopyFieldEnMessages,
  },
  de: {
    CloseButton: closeButtonDeMessages,
    DeveloperReportDialog: developerReportDialogDeMessages,
    DigitalDisplay: digitalDisplayDeMessages,
    HelpText: helpTextDeMessages,
    QrCodeOverlay: qrCodeOverlayDeMessages,
    Sidebar: {
      ...sidebarDeMessages,
      participantSummary: participantSummaryDeMessages,
      settings: settingsPanelDeMessages,
      share: sharePanelDeMessages,
      status: statusPanelDeMessages,
      timer: timerPanelDeMessages,
      timerSequenceInspector: timerSequenceInspectorDeMessages,
    },
    StatusBadge: statusBadgeDeMessages,
    SyncConflictDialog: syncConflictDialogDeMessages,
    Timer: timerDeMessages,
    TimerTitle: timerTitleDeMessages,
    TopRightControls: topRightControlsDeMessages,
    UrlCopyField: urlCopyFieldDeMessages,
  },
} as const satisfies Record<AppLocale, object>
