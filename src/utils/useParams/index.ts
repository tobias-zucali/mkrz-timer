import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useSearchParams, usePathname, useRouter } from "next/navigation"

import { ParamStyleContext } from "@/components/ParamStyledBody"
import { stripLocalePrefix } from "@/i18n/locale"
import { normalizeQueryParams, normalizeTitle } from "@/shared/security/input"
import { mergeSyncParamsPatch } from "@/shared/liveSession/mergeSyncParamsPatch"
import {
  parseTimerUrlState,
  projectTimerUrlStateToSyncParams,
} from "@/shared/urlState"
import useDebouncedEffect from "@/utils/useDebouncedEffect"

import type { ParamBuildOptions } from "./params"
import {
  buildPathWithParams,
  getRemoteSessionOnlyOmitKeys,
  PAGE_TITLE_QUERY_PARAM,
} from "./params"

const URL_SYNC_DEBOUNCE_MS = 500
type CurrentParams = ReturnType<typeof normalizeQueryParams> & {
  pageTitle: string
}

const mergeParamsForEditing = (
  currentParams: CurrentParams,
  newParams: Partial<CurrentParams>,
) => {
  const { pageTitle = currentParams.pageTitle, ...syncParamPatch } = newParams
  const mergedSource = mergeSyncParamsPatch(currentParams, syncParamPatch)
  const normalizedParams = normalizeQueryParams({
    ...mergedSource,
  })

  return {
    ...normalizedParams,
    pageTitle: normalizeTitle(pageTitle),
    pid: currentParams.pid,
  }
}

const getPageTitleFromSearchParams = ({
  allowPageTitle,
  searchParams,
}: {
  allowPageTitle: boolean
  searchParams: URLSearchParams
}) =>
  allowPageTitle
    ? normalizeTitle(searchParams.get(PAGE_TITLE_QUERY_PARAM) ?? "")
    : ""

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
  const normalizedPathname = stripLocalePrefix(pathname)
  const isReadonlyRemotePath = normalizedPathname.startsWith("/view")
  const allowTimerState = !isReadonlyRemotePath
  const allowPageTitle = !isReadonlyRemotePath
  const parsedTimerUrlState = useMemo(
    () =>
      parseTimerUrlState({
        allowTimerState,
        searchParams: new URLSearchParams(searchParamsString),
      }),
    [allowTimerState, searchParamsString],
  )

  const [currentParams, setCurrentParams] = useState(
    () =>
      ({
        ...normalizeQueryParams(
          projectTimerUrlStateToSyncParams({
            state: parseTimerUrlState({
              allowTimerState,
              searchParams: new URLSearchParams(searchParamsString),
            }),
          }),
        ),
        pageTitle: getPageTitleFromSearchParams({
          allowPageTitle,
          searchParams: new URLSearchParams(searchParamsString),
        }),
      }) satisfies CurrentParams,
  )
  const syncParams = useMemo(
    () => normalizeQueryParams(currentParams),
    [currentParams],
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
      params: syncParams,
      getPathWithParams,
      getUrlWithParams,
      pageTitle: currentParams.pageTitle,
      readTimerUrlState: () =>
        parseTimerUrlState({
          allowTimerState:
            typeof window === "undefined"
              ? allowTimerState
              : !(
                  stripLocalePrefix(window.location.pathname).startsWith(
                    "/view",
                  ) ||
                  stripLocalePrefix(window.location.pathname).startsWith(
                    "/control",
                  )
                ),
          searchParams:
            typeof window === "undefined"
              ? new URLSearchParams(searchParamsString)
              : new URLSearchParams(window.location.search),
        }),
      setPageTitle: (nextPageTitle: string) => {
        setCurrentParams((curr) =>
          mergeParamsForEditing(curr, { pageTitle: nextPageTitle }),
        )
      },
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
      syncParams,
      setParams,
    ],
  )
}
