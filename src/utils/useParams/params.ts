import { normalizeSyncParamPatch } from "../../shared/security/input.ts"

export type TimerParams = Record<string, string | null | undefined>

export type ParamBuildOptions = {
  inherit?: boolean
  omit?: string[]
  params?: TimerParams
  pathname?: string
}

const colorParamKeys = ["bg", "fg", "pc"] as const
const remoteSessionOnlyOmitKeys = [
  "bg",
  "fg",
  "m",
  "pc",
  "pid",
  "s",
  "title",
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

  if (!pathname || !/^\/(?:control|view)(?:\/|$)/.test(pathname)) {
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
  const newSearchParams = new URLSearchParams()
  const omittedParams = new Set(omit)
  const mergedParams = inherit ? { ...currentParams, ...params } : params

  Object.entries(mergedParams).forEach(([key, value]) => {
    if (!value || omittedParams.has(key)) {
      return
    }

    const normalizedValue = normalizeSerializableParam(key, value)
    if (!normalizedValue) {
      return
    }

    newSearchParams.set(key, serializeParamValue(key, normalizedValue))
  })

  return `${pathname}?${newSearchParams.toString()}`
}
