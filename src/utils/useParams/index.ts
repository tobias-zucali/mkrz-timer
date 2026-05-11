import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useSearchParams, usePathname, useRouter } from "next/navigation"
import { ParamStyleContext } from "@/components/ParamStyledBody"

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
    pid: searchParams.get("pid") || "", // peer id
    rid: searchParams.get("rid") || "", // remote peer id
    control: searchParams.get("control") || null, // client control mode
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

  // debounced replace url
  useEffect(() => {
    const handler = setTimeout(() => {
      const newUrl = getPathWithParams({
        omit: getRemoteSessionOnlyOmitKeys(currentParams, searchParams.keys()),
        params: currentParams,
      })
      router.replace(newUrl)
    }, 500)

    return () => {
      clearTimeout(handler)
    }
  }, [currentParams, getPathWithParams, router, searchParams])

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
