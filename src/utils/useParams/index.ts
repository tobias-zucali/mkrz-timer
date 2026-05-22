import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useSearchParams, usePathname, useRouter } from "next/navigation"
import { ParamStyleContext } from "@/components/ParamStyledBody"
import { normalizeQueryParams } from "@/shared/security/input"
import { mergeSyncParamsPatch } from "@/shared/remoteSession/mergeSyncParamsPatch"
import {
  parseTimerUrlState,
  projectTimerUrlStateToSyncParams,
} from "@/shared/urlState"
import useDebouncedEffect from "@/utils/useDebouncedEffect"

import type { ParamBuildOptions } from "./params"
import { buildPathWithParams, getRemoteSessionOnlyOmitKeys } from "./params"

const URL_SYNC_DEBOUNCE_MS = 500

const mergeParamsForEditing = (
  currentParams: ReturnType<typeof normalizeQueryParams>,
  newParams: Partial<ReturnType<typeof normalizeQueryParams>>,
) => {
  const mergedSource = mergeSyncParamsPatch(currentParams, newParams)
  const normalizedParams = normalizeQueryParams({
    ...mergedSource,
  })

  return {
    ...normalizedParams,
    pid: currentParams.pid,
  }
}

export default function useParams() {
  const nextSearchParams = useSearchParams()
  const nextPathname = usePathname()
  const pathname =
    typeof window === "undefined" ? nextPathname : window.location.pathname
  const router = useRouter()
  const { setColors } = useContext(ParamStyleContext)

  const searchParamsString =
    typeof window === "undefined"
      ? nextSearchParams.toString()
      : window.location.search.replace(/^\?/, "")
  const searchParams = useMemo(
    () => new URLSearchParams(searchParamsString),
    [searchParamsString],
  )
  const isSearchParamsEmpty = searchParams.size === 0
  const allowTimerState = !pathname.startsWith("/view")
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
      projectTimerUrlStateToSyncParams({
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
    if (typeof window !== "undefined") {
      const skipSyncUntil = (
        window as typeof window & { __timerSkipUrlSyncUntil?: number }
      ).__timerSkipUrlSyncUntil

      if (skipSyncUntil && skipSyncUntil > Date.now()) {
        return
      }
    }

    if (targetUrl === currentUrl) {
      return
    }

    router.replace(targetUrl)
  }, [currentUrl, router, targetUrl])

  useDebouncedEffect(replaceUrlIfChanged, URL_SYNC_DEBOUNCE_MS)

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
