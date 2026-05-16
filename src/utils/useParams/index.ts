import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useSearchParams, usePathname, useRouter } from "next/navigation"
import { ParamStyleContext } from "@/components/ParamStyledBody"
import { normalizeQueryParams } from "@/shared/security/input"
import useDebouncedEffect from "@/utils/useDebouncedEffect"

import type { ParamBuildOptions } from "./params"
import { buildPathWithParams, getRemoteSessionOnlyOmitKeys } from "./params"

export default function useParams() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const { setColors } = useContext(ParamStyleContext)

  const isSearchParamsEmpty = searchParams.size === 0

  const [currentParams, setCurrentParams] = useState(() =>
    normalizeQueryParams({
      bg: searchParams.get("bg"),
      fg: searchParams.get("fg"),
      m: searchParams.get("m"),
      pc: searchParams.get("pc"),
      s: searchParams.get("s"),
      title: searchParams.get("title"),
    }),
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
    setCurrentParams((curr) => ({
      ...normalizeQueryParams({
        ...curr,
        ...newParams,
      }),
      pid: curr.pid,
    }))
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
      params: currentParams,
      setParams,
      getPathWithParams,
      getUrlWithParams,
      isSearchParamsEmpty,
    }),
    [
      currentParams,
      setParams,
      getPathWithParams,
      getUrlWithParams,
      isSearchParamsEmpty,
    ],
  )
}
