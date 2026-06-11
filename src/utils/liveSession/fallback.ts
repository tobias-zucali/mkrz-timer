import type { SessionSnapshot } from "../../shared/liveSession/types.ts"

export const selectLocalFallbackSnapshot = ({
  currentLocalSnapshot,
  lastConfirmedServerSnapshot,
  pendingLocalSnapshot,
  pendingServerSnapshot,
}: {
  currentLocalSnapshot: SessionSnapshot
  lastConfirmedServerSnapshot: SessionSnapshot | null
  pendingLocalSnapshot: SessionSnapshot | null
  pendingServerSnapshot: SessionSnapshot | null
}) =>
  pendingLocalSnapshot ??
  pendingServerSnapshot ??
  lastConfirmedServerSnapshot ??
  currentLocalSnapshot
