import type { ActionDialogAction } from "@/components/ActionDialog"
import getSessionPresentation, {
  type SessionPresentationModel,
} from "@/utils/sessionPresentation"

function getOtherParticipantLabel(otherParticipantCount: number) {
  return otherParticipantCount === 1 ? "other client" : "other clients"
}

export function getConnectionErrorDetail(error: Error) {
  const detail = error.message.trim()
  return detail || "An unknown error was caught."
}

export function getExitConfirmationDialog({
  completeEndRemoteSession,
  onCancel,
  otherParticipantCount,
  pendingExitConfirmation,
}: {
  completeEndRemoteSession: () => Promise<void>
  onCancel: () => void
  otherParticipantCount: number
  pendingExitConfirmation: "end-live-session" | "leave-control-client"
}): {
  actions: ActionDialogAction[]
  description: string
  eyebrow: string
  title: string
} {
  const otherParticipantLabel = getOtherParticipantLabel(otherParticipantCount)

  if (pendingExitConfirmation === "end-live-session") {
    return {
      actions: [
        {
          label: "Keep live session open",
          onClick: onCancel,
        },
        {
          label: "End live session",
          onClick: () => {
            onCancel()
            void completeEndRemoteSession()
          },
          tone: "primary",
        },
      ],
      description: `This will disconnect ${otherParticipantCount} ${otherParticipantLabel} from the live session immediately.`,
      eyebrow: "Live session confirmation",
      title: "End the live session for everyone?",
    }
  }

  return {
    actions: [
      {
        label: "Keep control client open",
        onClick: onCancel,
      },
      {
        label: "Leave control client",
        onClick: () => {
          onCancel()
          void completeEndRemoteSession()
        },
        tone: "primary",
      },
    ],
    description: `This control client still has ${otherParticipantCount} ${otherParticipantLabel} connected. Leaving now can interrupt the active workshop.`,
    eyebrow: "Live session confirmation",
    title: "Close this control client?",
  }
}

export function getReadonlyPlaceholder({
  onOpenStatusPanel,
  remoteError,
  sessionPresentation,
}: {
  onOpenStatusPanel: () => void
  remoteError: Error | null
  sessionPresentation: SessionPresentationModel
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

  const remoteErrorMessage = remoteError?.message.trim() ?? ""
  const showRetryLink =
    sessionPresentation.state === "liveConflict" &&
    /retry the connection/i.test(remoteErrorMessage)

  return {
    actionLabel: showRetryLink ? "Retry the connection" : undefined,
    body: showRetryLink
      ? "Automatic recovery timed out."
      : remoteErrorMessage ||
        sessionPresentation.statusPanel.description ||
        "Waiting for the shared timer state.",
    eyebrow: showRetryLink
      ? undefined
      : sessionPresentation.statusPanel.summaryLabel,
    heading: sessionPresentation.statusPanel.stateLabel,
    onAction: showRetryLink ? onOpenStatusPanel : undefined,
    tone,
  }
}
