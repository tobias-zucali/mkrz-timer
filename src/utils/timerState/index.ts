export {
  resolveSessionSnapshotAt,
  resolveTimerStateAt,
  sessionSnapshotsMatch,
  stampSessionSnapshotAt,
  stampTimerStateAt,
} from "../../shared/timerState.ts"

export type { SessionSnapshot as TimerSnapshot } from "../../shared/liveSession/types.ts"
export type TimerState =
  import("../../shared/liveSession/types.ts").SessionSnapshot["state"]
