import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useSearchParams, usePathname, useRouter } from "next/navigation"
import { ParamStyleContext } from "@/components/ParamStyledBody"
import useDebouncedEffect from "@/utils/useDebouncedEffect"

import type { ParamBuildOptions } from "./params"
import {
  buildPathWithParams,
  getRemoteSessionOnlyOmitKeys,
  withColorHash,
} from "./params"

export default function useParams() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const { setColors } = useContext(ParamStyleContext)

  const isSearchParamsEmpty = searchParams.size === 0

  const [currentParams, setCurrentParams] = useState({
    m: searchParams.get("m") || "01",
    s: searchParams.get("s") || "00",
    title: searchParams.get("title") || "",
    bg: withColorHash(searchParams.get("bg") || "000000"),
    fg: withColorHash(searchParams.get("fg") || "ffffff"),
    pc: withColorHash(searchParams.get("pc") || "d61f69"),
    pid: "",
    rid: searchParams.get("rid") || "",
    control: searchParams.get("control") || null,
  })

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
      ...curr,
      ...newParams,
    }))
  }, [])

  const targetUrl = useMemo(
    () =>
      getPathWithParams({
        omit: getRemoteSessionOnlyOmitKeys(currentParams, searchParams.keys()),
        params: currentParams,
      }),
    [currentParams, getPathWithParams, searchParams],
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
