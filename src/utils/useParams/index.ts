import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useSearchParams, usePathname, useRouter } from "next/navigation"
import { ParamStyleContext } from "@/components/ParamStyledBody"
import { normalizeQueryParams } from "@/shared/security/input"
import {
  parseTimerUrlState,
  projectFirstUrlTimerRowToSyncParams,
} from "@/shared/urlState"
import useDebouncedEffect from "@/utils/useDebouncedEffect"

import type { ParamBuildOptions } from "./params"
import { buildPathWithParams, getRemoteSessionOnlyOmitKeys } from "./params"

const mergeParamsForEditing = (
  currentParams: ReturnType<typeof normalizeQueryParams>,
  newParams: Partial<ReturnType<typeof normalizeQueryParams>>,
) => {
  const normalizedParams = normalizeQueryParams({
    ...currentParams,
    ...newParams,
  })

  return {
    ...normalizedParams,
    m: newParams.m ?? currentParams.m,
    pid: currentParams.pid,
    s: newParams.s ?? currentParams.s,
  }
}

export default function useParams() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const { setColors } = useContext(ParamStyleContext)

  const isSearchParamsEmpty = searchParams.size === 0
  const allowTimerState = !pathname.startsWith("/view")
  const searchParamsString = searchParams.toString()
  const parsedTimerUrlState = useMemo(
    () =>
      parseTimerUrlState({
        allowTimerState,
        searchParams: new URLSearchParams(searchParamsString),
      }),
    [allowTimerState, searchParamsString],
  )

  const [currentParams, setCurrentParams] = useState(() =>
    normalizeQueryParams(
      projectFirstUrlTimerRowToSyncParams({
        state: parseTimerUrlState({
          allowTimerState,
          searchParams: new URLSearchParams(searchParamsString),
        }),
      }),
    ),
  )

  useEffect(() => {
    setColors({
      bg: currentParams.bg,
      fg: currentParams.fg,
      pc: currentParams.pc,
    })
  }, [setColors, currentParams.bg, currentParams.fg, currentParams.pc])

  const getPathWithParams = useCallback(
    (options: ParamBuildOptions = {}) => {
      return buildPathWithParams(currentParams, {
        pathname,
        ...options,
      })
    },
    [currentParams, pathname],
  )

  const getUrlWithParams = useCallback(
    (options: ParamBuildOptions = {}) => {
      if (typeof window === "undefined") {
        return getPathWithParams(options)
      }
      return new URL(
        getPathWithParams(options),
        window.location.origin,
      ).toString()
    },
    [getPathWithParams],
  )

  const setParams = useCallback((newParams: Partial<typeof currentParams>) => {
    setCurrentParams((curr) => mergeParamsForEditing(curr, newParams))
  }, [])

  const targetUrl = useMemo(
    () =>
      getPathWithParams({
        omit: getRemoteSessionOnlyOmitKeys(
          currentParams,
          searchParams.keys(),
          pathname,
        ),
        params: currentParams,
      }),
    [currentParams, getPathWithParams, pathname, searchParams],
  )

  const currentUrl = useMemo(
    () =>
      `${pathname}${searchParams.size > 0 ? `?${searchParams.toString()}` : ""}`,
    [pathname, searchParams],
  )

  const replaceUrlIfChanged = useCallback(() => {
    if (targetUrl === currentUrl) {
      return
    }

    router.replace(targetUrl)
  }, [currentUrl, router, targetUrl])

  useDebouncedEffect(replaceUrlIfChanged, 500)

  return useMemo(
    () => ({
      isSearchParamsEmpty,
      parsedTimerUrlState,
      params: currentParams,
      getPathWithParams,
      getUrlWithParams,
      readTimerUrlState: () =>
        parseTimerUrlState({
          allowTimerState:
            typeof window === "undefined"
              ? allowTimerState
              : !window.location.pathname.startsWith("/view"),
          searchParams:
            typeof window === "undefined"
              ? new URLSearchParams(searchParamsString)
              : new URLSearchParams(window.location.search),
        }),
      setParams,
    }),
    [
      allowTimerState,
      currentParams,
      getPathWithParams,
      getUrlWithParams,
      isSearchParamsEmpty,
      parsedTimerUrlState,
      searchParamsString,
      setParams,
    ],
  )
}
