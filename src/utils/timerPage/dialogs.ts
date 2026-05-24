import type { ActionDialogAction } from "@/components/ActionDialog"
import type { AppTranslationFn } from "@/i18n/translator"
import { getRemoteSessionErrorKey } from "@/utils/remoteSession/lifecycle"
import getSessionPresentation, {
  type SessionPresentationModel,
} from "@/utils/sessionPresentation"

function getOtherParticipantLabel(
  otherParticipantCount: number,
  t: AppTranslationFn,
) {
  return otherParticipantCount === 1 ? t("otherClient") : t("otherClients")
}

export function getConnectionErrorDetail(error: Error, t: AppTranslationFn) {
  const translationKey = getRemoteSessionErrorKey(error)
  if (translationKey) {
    return t(translationKey)
  }

  const detail = error.message.trim()
  return detail || t("unknownError")
}

export function getExitConfirmationDialog({
  completeEndRemoteSession,
  onCancel,
  otherParticipantCount,
  pendingExitConfirmation,
  t,
}: {
  completeEndRemoteSession: () => Promise<void>
  onCancel: () => void
  otherParticipantCount: number
  pendingExitConfirmation: "end-live-session" | "leave-control-client"
  t: AppTranslationFn
}): {
  actions: ActionDialogAction[]
  description: string
  eyebrow: string
  title: string
} {
  const otherParticipantLabel = getOtherParticipantLabel(
    otherParticipantCount,
    t,
  )

  if (pendingExitConfirmation === "end-live-session") {
    return {
      actions: [
        {
          label: t("keepLiveSessionOpen"),
          onClick: onCancel,
        },
        {
          label: t("endLiveSession"),
          onClick: () => {
            onCancel()
            void completeEndRemoteSession()
          },
          tone: "primary",
        },
      ],
      description: t("endLiveSessionDescription", {
        count: otherParticipantCount,
        participants: otherParticipantLabel,
      }),
      eyebrow: t("liveSessionConfirmation"),
      title: t("endLiveSessionTitle"),
    }
  }

  return {
    actions: [
      {
        label: t("keepControlClientOpen"),
        onClick: onCancel,
      },
      {
        label: t("leaveControlClient"),
        onClick: () => {
          onCancel()
          void completeEndRemoteSession()
        },
        tone: "primary",
      },
    ],
    description: t("leaveControlClientDescription", {
      count: otherParticipantCount,
      participants: otherParticipantLabel,
    }),
    eyebrow: t("liveSessionConfirmation"),
    title: t("closeControlClientTitle"),
  }
}

export function getReadonlyPlaceholder({
  onOpenStatusPanel,
  remoteError,
  sessionPresentation,
  t,
}: {
  onOpenStatusPanel: () => void
  remoteError: Error | null
  sessionPresentation: SessionPresentationModel
  t: AppTranslationFn
}) {
  const readonlyPlaceholderToneBySessionState: Partial<
    Record<
      ReturnType<typeof getSessionPresentation>["state"],
      "connecting" | "failed" | "reconnecting"
    >
  > = {
    liveConflict: "failed",
    liveConnecting: "connecting",
    liveOffline: "reconnecting",
    liveReconnecting: "reconnecting",
  }

  const tone = readonlyPlaceholderToneBySessionState[sessionPresentation.state]
  if (!tone) {
    return undefined
  }

  const remoteErrorMessage = remoteError
    ? getConnectionErrorDetail(remoteError, t)
    : ""
  const showRetryLink =
    sessionPresentation.state === "liveConflict" &&
    getRemoteSessionErrorKey(remoteError) === "retryingAutomaticallyDetail"

  return {
    actionLabel: showRetryLink ? t("retryTheConnection") : undefined,
    body: showRetryLink
      ? t("automaticRecoveryTimedOut")
      : remoteErrorMessage ||
        sessionPresentation.statusPanel.description ||
        t("waitingForSharedTimerState"),
    eyebrow: showRetryLink
      ? undefined
      : sessionPresentation.statusPanel.summaryLabel,
    heading: sessionPresentation.statusPanel.stateLabel,
    onAction: showRetryLink ? onOpenStatusPanel : undefined,
    tone,
  }
}
