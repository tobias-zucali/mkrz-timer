export {
  resolveSessionSnapshotAt,
  resolveTimerStateAt,
  sessionSnapshotsMatch,
  stampSessionSnapshotAt,
  stampTimerStateAt,
} from "../../shared/timerState.ts"

export type { SessionSnapshot as TimerSnapshot } from "../../shared/remoteSession/types.ts"
export type TimerState =
  import("../../shared/remoteSession/types.ts").SessionSnapshot["state"]
