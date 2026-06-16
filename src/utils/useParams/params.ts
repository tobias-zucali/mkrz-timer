import { stripLocalePrefix } from "../../i18n/locale.ts"
import {
  normalizeSyncParamPatch,
  normalizeTitle,
} from "../../shared/security/input.ts"
import { buildTimerUrlSearchParams } from "../../shared/urlState/index.ts"
import { buildDefaultTimerSequenceRow } from "../../shared/timerSequence.ts"
import type { SyncParams } from "../../shared/liveSession/types.ts"

export const PAGE_TITLE_QUERY_PARAM = "title"

export type TimerParams = Partial<SyncParams> & {
  pageTitle?: string
} & Record<string, unknown>

export type ParamBuildOptions = {
  inherit?: boolean
  omit?: string[]
  params?: TimerParams
  pathname?: string
}

const colorParamKeys = ["pc"] as const
const settingsOnlyOmitKeys = ["s", "ts"] as const
const remoteSessionOnlyOmitKeys = ["a", "pid"] as const
const controlRemoteOnlyOmitKeys = [...remoteSessionOnlyOmitKeys]
const readonlyRemoteOnlyOmitKeys = [
  ...remoteSessionOnlyOmitKeys,
  PAGE_TITLE_QUERY_PARAM,
] as const
export const withColorHash = (value: string) => {
  return value.startsWith("#") ? value : `#${value}`
}

export const serializeParamValue = (key: string, value: string) => {
  if (
    value &&
    colorParamKeys.includes(key as (typeof colorParamKeys)[number])
  ) {
    return value.replace(/^#/, "")
  }

  return value
}

const normalizeSerializableParam = (key: string, value: string) => {
  if (colorParamKeys.includes(key as (typeof colorParamKeys)[number])) {
    return normalizeSyncParamPatch({ [key]: value })?.[
      key as keyof ReturnType<typeof normalizeSyncParamPatch>
    ] as string | undefined
  }

  switch (key) {
    case "m":
    case "s":
    case "title":
      return normalizeSyncParamPatch({ [key]: value })?.[
        key as keyof ReturnType<typeof normalizeSyncParamPatch>
      ] as string | undefined
    case "pageTitle":
      return normalizeTitle(value)
    default:
      return value
  }
}

export const getRemoteSessionOnlyOmitKeys = (
  currentParams: TimerParams,
  _unusedInitialParamKeys: Iterable<string>,
  pathname?: string,
) => {
  void _unusedInitialParamKeys
  void currentParams
  const normalizedPathname = pathname ? stripLocalePrefix(pathname) : pathname

  if (
    !normalizedPathname ||
    !/^\/(?:join|manage|view|control)(?:\/|$)/.test(normalizedPathname)
  ) {
    return []
  }

  if (
    normalizedPathname.startsWith("/join/") ||
    normalizedPathname.startsWith("/view/")
  ) {
    return [...readonlyRemoteOnlyOmitKeys]
  }

  return [...controlRemoteOnlyOmitKeys]
}

export const getSettingsOnlyOmitKeys = () => [...settingsOnlyOmitKeys]

export const buildPathWithParams = (
  currentParams: TimerParams,
  {
    inherit = true,
    omit = [],
    params = {},
    pathname = "/",
  }: ParamBuildOptions = {},
) => {
  const omittedParams = new Set(omit)
  const mergedParams = inherit ? { ...currentParams, ...params } : params
  const passthroughParams: Record<string, string | undefined> = {}

  Object.entries(mergedParams).forEach(([key, value]) => {
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      omittedParams.has(key) ||
      (key === "pageTitle" && omittedParams.has(PAGE_TITLE_QUERY_PARAM))
    ) {
      return
    }

    if (key === "pageTitle" && typeof value === "string") {
      passthroughParams[PAGE_TITLE_QUERY_PARAM] = normalizeSerializableParam(
        "pageTitle",
        value,
      )
      return
    }

    if (["theme", "m", "pc", "s", "snd", "title", "tts"].includes(key)) {
      return
    }

    if (typeof value === "string") {
      passthroughParams[key] = value
    }
  })

  const normalizedRows =
    Array.isArray(mergedParams.rows) && mergedParams.rows.length > 0
      ? mergedParams.rows
      : [buildDefaultTimerSequenceRow()]

  const newSearchParams = buildTimerUrlSearchParams({
    activeIndex:
      omittedParams.has("a") || typeof mergedParams.activeIndex !== "number"
        ? 0
        : mergedParams.activeIndex,
    theme: omittedParams.has("theme") ? null : mergedParams.theme,
    extraParams: passthroughParams,
    rows:
      omittedParams.has("v") || omittedParams.has("t") ? [] : normalizedRows,
    snd:
      omittedParams.has("s") || !mergedParams.snd
        ? undefined
        : mergedParams.snd,
    tts: omittedParams.has("ts") ? undefined : mergedParams.tts,
  })

  const search = newSearchParams.toString()

  return search ? `${pathname}?${search}` : pathname
}
