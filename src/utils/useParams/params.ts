import { normalizeSyncParamPatch } from "../../shared/security/input.ts"
import {
  buildTimerUrlSearchParams,
  buildUrlTimerRowFromSyncParams,
} from "../../shared/urlState/index.ts"

export type TimerParams = Record<string, string | null | undefined>

export type ParamBuildOptions = {
  inherit?: boolean
  omit?: string[]
  params?: TimerParams
  pathname?: string
}

const colorParamKeys = ["bg", "fg", "pc"] as const
const remoteSessionOnlyOmitKeys = ["bg", "pid", "fg", "t", "v"] as const
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

  if (!pathname || !/^\/(?:view|control)(?:\/|$)/.test(pathname)) {
    return []
  }

  return [...remoteSessionOnlyOmitKeys]
}

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
    if (!value || omittedParams.has(key)) {
      return
    }

    if (["bg", "fg", "m", "pc", "s", "title"].includes(key)) {
      return
    }

    passthroughParams[key] = value
  })

  const normalizedPc = normalizeSerializableParam("pc", mergedParams.pc ?? "")
  const normalizedTitle = normalizeSerializableParam(
    "title",
    mergedParams.title ?? "",
  )
  const normalizedMinutes = normalizeSerializableParam(
    "m",
    mergedParams.m ?? "",
  )
  const normalizedSeconds = normalizeSerializableParam(
    "s",
    mergedParams.s ?? "",
  )

  const newSearchParams = buildTimerUrlSearchParams({
    bg:
      omittedParams.has("bg") || !mergedParams.bg
        ? null
        : normalizeSerializableParam("bg", mergedParams.bg),
    extraParams: passthroughParams,
    fg:
      omittedParams.has("fg") || !mergedParams.fg
        ? null
        : normalizeSerializableParam("fg", mergedParams.fg),
    rows:
      omittedParams.has("v") ||
      omittedParams.has("t") ||
      !normalizedPc ||
      !normalizedMinutes ||
      !normalizedSeconds ||
      normalizedTitle === undefined
        ? []
        : [
            buildUrlTimerRowFromSyncParams({
              m: normalizedMinutes,
              pc: normalizedPc,
              s: normalizedSeconds,
              title: normalizedTitle,
            }),
          ],
  })

  const search = newSearchParams.toString()

  return search ? `${pathname}?${search}` : pathname
}
