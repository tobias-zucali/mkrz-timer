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

export const getRemoteSessionOnlyOmitKeys = (
  currentParams: TimerParams,
  initialParamKeys: Iterable<string>,
) => {
  if (!currentParams.rid) {
    return []
  }

  const initialKeys = new Set(initialParamKeys)
  const isRemoteSessionOnlyUrl =
    initialKeys.has("rid") &&
    remoteSessionOnlyOmitKeys.every((key) => !initialKeys.has(key))

  if (currentParams.control === "42") {
    return []
  }

  return isRemoteSessionOnlyUrl ? [...remoteSessionOnlyOmitKeys] : []
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
    if (value && !omittedParams.has(key)) {
      newSearchParams.set(key, serializeParamValue(key, value))
    }
  })

  return `${pathname}?${newSearchParams.toString()}`
}
