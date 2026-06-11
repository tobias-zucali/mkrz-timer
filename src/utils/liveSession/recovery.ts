import type { SessionSnapshot } from "../../shared/liveSession/types.ts"
import { sessionSnapshotsMatch } from "../timerState/index.ts"

export type SnapshotRecoveryResolution =
  | "accept-local"
  | "accept-server"
  | "conflict"

export const decideSnapshotRecovery = ({
  baselineSnapshot,
  localSnapshot,
  now,
  serverSnapshot,
}: {
  baselineSnapshot: SessionSnapshot
  localSnapshot: SessionSnapshot
  now?: number
  serverSnapshot: SessionSnapshot
}) => {
  const localChanged = !sessionSnapshotsMatch({
    currentSnapshot: baselineSnapshot,
    incomingSnapshot: localSnapshot,
    now,
  })
  const serverChanged = !sessionSnapshotsMatch({
    currentSnapshot: baselineSnapshot,
    incomingSnapshot: serverSnapshot,
    now,
  })
  const snapshotsConverged = sessionSnapshotsMatch({
    currentSnapshot: localSnapshot,
    incomingSnapshot: serverSnapshot,
    now,
  })

  let resolution: SnapshotRecoveryResolution = "accept-server"
  if (snapshotsConverged) {
    resolution = "accept-server"
  } else if (localChanged && !serverChanged) {
    resolution = "accept-local"
  } else if (localChanged && serverChanged) {
    resolution = "conflict"
  }

  return {
    localChanged,
    resolution,
    serverChanged,
  }
}
