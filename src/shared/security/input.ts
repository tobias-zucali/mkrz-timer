import type {
  RemoteAccessRole,
  RemoteAccessTokenSet,
  RelayClientMessage,
  RelayServerMessage,
  SessionParticipant,
  SessionSnapshot,
  SyncParams,
} from "@/shared/remoteSession/types"

export const DEFAULT_SYNC_PARAMS: SyncParams = {
  bg: "#000000",
  fg: "#ffffff",
  m: "01",
  pc: "#d61f69",
  s: "00",
  title: "",
}

export const DEFAULT_TIMER_STATE = {
  elapsedTime: 0,
  isPaused: true,
  isStarted: false,
  revision: 0,
  totalDuration: 60,
} satisfies SessionSnapshot["state"]

export const MAX_CLIENT_MESSAGE_BYTES = 16 * 1024
export const MAX_SERVER_MESSAGE_BYTES = 32 * 1024
export const MAX_CLIENT_ID_LENGTH = 64
export const MAX_SESSION_ID_LENGTH = 64
export const MAX_REMOTE_ACCESS_TOKEN_LENGTH = 64
export const MAX_TITLE_LENGTH = 64
export const MAX_TIMER_MINUTES = 999
export const MAX_TIMER_SECONDS = 59
export const MAX_TIMER_DURATION_SECONDS =
  MAX_TIMER_MINUTES * 60 + MAX_TIMER_SECONDS
export const MAX_REVISION = 1_000_000_000
export const MAX_ELAPSED_TIME_SECONDS = 7 * 24 * 60 * 60

const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/
const REMOTE_ACCESS_TOKEN_PATTERN = /^[A-Za-z0-9_-]{1,64}$/
const HEX_COLOR_PATTERN = /^#?[0-9a-fA-F]{6}$/
const DIGITS_ONLY_PATTERN = /^\d+$/

type UnknownRecord = Record<string, unknown>

const isObject = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const hasOnlyKeys = (value: UnknownRecord, allowedKeys: string[]) =>
  Object.keys(value).every((key) => allowedKeys.includes(key))

const normalizeFiniteNumber = ({
  fallback,
  floor = false,
  max,
  min = 0,
  value,
}: {
  fallback: number
  floor?: boolean
  max: number
  min?: number
  value: unknown
}) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback
  }

  const nextValue = floor ? Math.floor(value) : value
  if (nextValue < min || nextValue > max) {
    return fallback
  }

  return nextValue
}

const normalizeTextWhitespace = (value: string) =>
  value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]+/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, " ")

export const normalizeTitle = (value: unknown) => {
  if (typeof value !== "string") {
    return DEFAULT_SYNC_PARAMS.title
  }

  return normalizeTextWhitespace(value).slice(0, MAX_TITLE_LENGTH)
}

export const normalizeColor = (value: unknown, fallback: string) => {
  if (typeof value !== "string" || !HEX_COLOR_PATTERN.test(value)) {
    return fallback
  }

  return `#${value.replace(/^#/, "").toLowerCase()}`
}

const normalizeNumericString = ({
  fallback,
  max,
  value,
}: {
  fallback: string
  max: number
  value: unknown
}) => {
  if (typeof value !== "string") {
    return fallback
  }

  const trimmedValue = value.trim()
  if (!DIGITS_ONLY_PATTERN.test(trimmedValue)) {
    return fallback
  }

  const parsedValue = Number.parseInt(trimmedValue, 10)
  if (parsedValue < 0 || parsedValue > max) {
    return fallback
  }

  return parsedValue.toString().padStart(2, "0")
}

export const normalizeMinutes = (
  value: unknown,
  fallback: string = DEFAULT_SYNC_PARAMS.m,
) =>
  normalizeNumericString({
    fallback,
    max: MAX_TIMER_MINUTES,
    value,
  })

export const normalizeSeconds = (
  value: unknown,
  fallback: string = DEFAULT_SYNC_PARAMS.s,
) =>
  normalizeNumericString({
    fallback,
    max: MAX_TIMER_DURATION_SECONDS,
    value,
  })

const normalizeDurationParams = ({
  fallback,
  minutesValue,
  secondsValue,
}: {
  fallback: Pick<SyncParams, "m" | "s">
  minutesValue: unknown
  secondsValue: unknown
}) => {
  const normalizedMinutes = normalizeMinutes(minutesValue, fallback.m)
  const normalizedSeconds = normalizeSeconds(secondsValue, fallback.s)

  const minutesNumber = Number.parseInt(normalizedMinutes, 10)
  const secondsNumber = Number.parseInt(normalizedSeconds, 10)
  const totalSeconds = Math.min(
    minutesNumber * 60 + secondsNumber,
    MAX_TIMER_DURATION_SECONDS,
  )

  return {
    m: Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0"),
    s: (totalSeconds % 60).toString().padStart(2, "0"),
  }
}

export const normalizeSessionId = (value: unknown) => {
  if (
    typeof value !== "string" ||
    value.length > MAX_SESSION_ID_LENGTH ||
    !SESSION_ID_PATTERN.test(value)
  ) {
    return null
  }

  return value
}

export const normalizeClientId = (value: unknown) => {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_CLIENT_ID_LENGTH ||
    !SESSION_ID_PATTERN.test(value)
  ) {
    return null
  }

  return value
}

export const normalizeRemoteAccessToken = (value: unknown) => {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_REMOTE_ACCESS_TOKEN_LENGTH ||
    !REMOTE_ACCESS_TOKEN_PATTERN.test(value)
  ) {
    return null
  }

  return value
}

export const normalizeSyncParams = (
  value: unknown,
  fallback: SyncParams = DEFAULT_SYNC_PARAMS,
): SyncParams => {
  const params = isObject(value) ? value : {}
  const duration = normalizeDurationParams({
    fallback,
    minutesValue: params.m,
    secondsValue: params.s,
  })

  return {
    bg: normalizeColor(params.bg, fallback.bg),
    fg: normalizeColor(params.fg, fallback.fg),
    m: duration.m,
    pc: normalizeColor(params.pc, fallback.pc),
    s: duration.s,
    title: normalizeTitle(params.title),
  }
}

export const normalizeSyncParamPatch = (value: unknown) => {
  if (!isObject(value)) {
    return null
  }

  const normalizedPatch: Partial<SyncParams> = {}

  if ("bg" in value) {
    normalizedPatch.bg = normalizeColor(value.bg, DEFAULT_SYNC_PARAMS.bg)
  }
  if ("fg" in value) {
    normalizedPatch.fg = normalizeColor(value.fg, DEFAULT_SYNC_PARAMS.fg)
  }
  if ("m" in value) {
    normalizedPatch.m = normalizeNumericString({
      fallback: DEFAULT_SYNC_PARAMS.m,
      max: MAX_TIMER_MINUTES,
      value: value.m,
    })
  }
  if ("pc" in value) {
    normalizedPatch.pc = normalizeColor(value.pc, DEFAULT_SYNC_PARAMS.pc)
  }
  if ("s" in value) {
    normalizedPatch.s = normalizeNumericString({
      fallback: DEFAULT_SYNC_PARAMS.s,
      max: MAX_TIMER_DURATION_SECONDS,
      value: value.s,
    })
  }
  if ("title" in value) {
    normalizedPatch.title = normalizeTitle(value.title)
  }

  return normalizedPatch
}

export const normalizeTimerState = (
  value: unknown,
  fallback: SessionSnapshot["state"] = DEFAULT_TIMER_STATE,
): SessionSnapshot["state"] => {
  const state = isObject(value) ? value : {}
  const totalDuration = normalizeFiniteNumber({
    fallback: fallback.totalDuration,
    floor: true,
    max: MAX_TIMER_DURATION_SECONDS,
    min: 0,
    value: state.totalDuration,
  })

  return {
    elapsedTime: normalizeFiniteNumber({
      fallback: fallback.elapsedTime,
      max: MAX_ELAPSED_TIME_SECONDS,
      min: 0,
      value: state.elapsedTime,
    }),
    isPaused:
      typeof state.isPaused === "boolean" ? state.isPaused : fallback.isPaused,
    isStarted:
      typeof state.isStarted === "boolean"
        ? state.isStarted
        : fallback.isStarted,
    revision: normalizeFiniteNumber({
      fallback: fallback.revision,
      floor: true,
      max: MAX_REVISION,
      min: 0,
      value: state.revision,
    }),
    totalDuration,
  }
}

export const normalizeSessionSnapshot = (
  value: unknown,
  fallback?: SessionSnapshot,
): SessionSnapshot => ({
  params: normalizeSyncParams(
    value && isObject(value) ? value.params : undefined,
    fallback?.params ?? DEFAULT_SYNC_PARAMS,
  ),
  state: normalizeTimerState(
    value && isObject(value) ? value.state : undefined,
    fallback?.state ?? DEFAULT_TIMER_STATE,
  ),
})

export const normalizeSessionParticipant = (value: unknown) => {
  if (!isObject(value) || !hasOnlyKeys(value, ["canControl", "clientId"])) {
    return null
  }

  const clientId = normalizeClientId(value.clientId)
  if (clientId === null || typeof value.canControl !== "boolean") {
    return null
  }

  return {
    canControl: value.canControl,
    clientId,
  } satisfies SessionParticipant
}

export const normalizeSessionParticipants = (value: unknown) => {
  if (!Array.isArray(value)) {
    return null
  }

  const participants = value
    .map(normalizeSessionParticipant)
    .filter(
      (participant): participant is SessionParticipant => participant !== null,
    )

  if (participants.length !== value.length) {
    return null
  }

  return participants
}

export const normalizeQueryParams = (value: unknown) => {
  const params = isObject(value) ? value : {}

  return {
    bg: normalizeColor(params.bg, DEFAULT_SYNC_PARAMS.bg),
    fg: normalizeColor(params.fg, DEFAULT_SYNC_PARAMS.fg),
    m: normalizeMinutes(params.m),
    pc: normalizeColor(params.pc, DEFAULT_SYNC_PARAMS.pc),
    pid: "",
    s: normalizeSeconds(params.s),
    title: normalizeTitle(params.title),
  }
}

export const normalizeRemoteAccessRole = (value: unknown) => {
  if (value === "control" || value === "readonly") {
    return value satisfies RemoteAccessRole
  }

  return null
}

export const normalizeRemoteAccessTokenSet = (value: unknown) => {
  if (!isObject(value) || !hasOnlyKeys(value, ["control", "readonly"])) {
    return null
  }

  const control = normalizeRemoteAccessToken(value.control)
  const readonly = normalizeRemoteAccessToken(value.readonly)

  if (control === null || readonly === null) {
    return null
  }

  return {
    control,
    readonly,
  } satisfies RemoteAccessTokenSet
}

const parseJsonRecord = ({
  maxBytes,
  value,
}: {
  maxBytes: number
  value: string
}) => {
  if (value.length === 0 || value.length > maxBytes) {
    return null
  }

  try {
    const parsedValue = JSON.parse(value)
    return isObject(parsedValue) ? parsedValue : null
  } catch {
    return null
  }
}

export const normalizeRelayClientMessage = (
  value: string,
): RelayClientMessage | null => {
  const parsedValue = parseJsonRecord({
    maxBytes: MAX_CLIENT_MESSAGE_BYTES,
    value,
  })

  if (!parsedValue || typeof parsedValue.type !== "string") {
    return null
  }

  switch (parsedValue.type) {
    case "create-session": {
      if (!hasOnlyKeys(parsedValue, ["clientId", "snapshot", "type"])) {
        return null
      }

      const clientId = normalizeClientId(parsedValue.clientId)
      if (clientId === null) {
        return null
      }

      return {
        clientId,
        snapshot: normalizeSessionSnapshot(parsedValue.snapshot),
        type: "create-session",
      }
    }
    case "join-session":
    case "retry-join-session": {
      if (
        !hasOnlyKeys(parsedValue, [
          "clientId",
          "role",
          "snapshot",
          "token",
          "type",
        ])
      ) {
        return null
      }

      const clientId = normalizeClientId(parsedValue.clientId)
      const role = normalizeRemoteAccessRole(parsedValue.role)
      const token = normalizeRemoteAccessToken(parsedValue.token)
      if (clientId === null || role === null || token === null) {
        return null
      }

      return {
        clientId,
        role,
        token,
        ...(parsedValue.type === "retry-join-session"
          ? {
              snapshot:
                parsedValue.snapshot === undefined
                  ? undefined
                  : normalizeSessionSnapshot(parsedValue.snapshot),
            }
          : {}),
        type: parsedValue.type,
      }
    }
    case "sync": {
      if (
        !hasOnlyKeys(parsedValue, [
          "clientId",
          "params",
          "sessionId",
          "state",
          "type",
        ])
      ) {
        return null
      }

      const clientId = normalizeClientId(parsedValue.clientId)
      const sessionId = normalizeSessionId(parsedValue.sessionId)
      if (clientId === null || sessionId === null) {
        return null
      }

      const params =
        parsedValue.params === undefined
          ? undefined
          : normalizeSyncParamPatch(parsedValue.params)
      const state =
        parsedValue.state === undefined
          ? undefined
          : normalizeTimerState(parsedValue.state)

      if (
        (parsedValue.params !== undefined && params === null) ||
        (parsedValue.state !== undefined && !isObject(parsedValue.state))
      ) {
        return null
      }

      return {
        clientId,
        ...(params ? { params } : {}),
        sessionId,
        ...(state ? { state } : {}),
        type: "sync",
      }
    }
    case "heartbeat":
    case "leave": {
      if (!hasOnlyKeys(parsedValue, ["clientId", "sessionId", "type"])) {
        return null
      }

      const clientId = normalizeClientId(parsedValue.clientId)
      const sessionId = normalizeSessionId(parsedValue.sessionId)
      if (clientId === null || sessionId === null) {
        return null
      }

      return {
        clientId,
        sessionId,
        type: parsedValue.type,
      }
    }
    default:
      return null
  }
}

export const normalizeRelayServerMessage = (
  value: string,
): RelayServerMessage | null => {
  const parsedValue = parseJsonRecord({
    maxBytes: MAX_SERVER_MESSAGE_BYTES,
    value,
  })

  if (!parsedValue || typeof parsedValue.type !== "string") {
    return null
  }

  switch (parsedValue.type) {
    case "error":
      if (!hasOnlyKeys(parsedValue, ["message", "type"])) {
        return null
      }
      return typeof parsedValue.message === "string"
        ? {
            message: normalizeTitle(parsedValue.message).slice(
              0,
              MAX_TITLE_LENGTH,
            ),
            type: "error",
          }
        : null
    case "participant-list": {
      if (!hasOnlyKeys(parsedValue, ["participants", "sessionId", "type"])) {
        return null
      }
      const participants = normalizeSessionParticipants(
        parsedValue.participants,
      )
      const sessionId = normalizeSessionId(parsedValue.sessionId)
      if (participants === null || sessionId === null) {
        return null
      }
      return {
        participants,
        sessionId,
        type: "participant-list",
      }
    }
    case "session":
    case "state-updated": {
      if (
        !hasOnlyKeys(parsedValue, [
          "accessTokens",
          "participants",
          "sessionId",
          "snapshot",
          "type",
        ])
      ) {
        return null
      }
      const participants = normalizeSessionParticipants(
        parsedValue.participants,
      )
      const sessionId = normalizeSessionId(parsedValue.sessionId)
      const accessTokens =
        parsedValue.accessTokens === undefined
          ? undefined
          : normalizeRemoteAccessTokenSet(parsedValue.accessTokens)
      if (
        participants === null ||
        sessionId === null ||
        (parsedValue.accessTokens !== undefined && accessTokens === null)
      ) {
        return null
      }
      return {
        ...(accessTokens ? { accessTokens } : {}),
        participants,
        sessionId,
        snapshot: normalizeSessionSnapshot(parsedValue.snapshot),
        type: parsedValue.type,
      }
    }
    default:
      return null
  }
}
