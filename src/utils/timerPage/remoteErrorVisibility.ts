import type { SessionPresentationState } from "@/utils/sessionPresentation"

export function shouldDisplayRemoteError(
  state: SessionPresentationState,
): boolean {
  return state !== "liveOffline" && state !== "liveReconnecting"
}
