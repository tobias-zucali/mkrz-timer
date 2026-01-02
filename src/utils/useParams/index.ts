import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";

export default function useParams() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const isSearchParamsEmpty = searchParams.size === 0;

  const [currentParams, setCurrentParams] = useState({
    m: searchParams.get("m") || "01",
    s: searchParams.get("s") || "00",
    title: searchParams.get("title") || "",
    bg: searchParams.get("bg") || "#000000",
    fg: searchParams.get("fg") || "#ffffff",
    pc: searchParams.get("pc") || "#d61f69",
    pid: searchParams.get("pid") || "", // peer id
    rid: searchParams.get("rid") || "", // remote peer id
    settings: searchParams.get("settings") || null, // settings open
  });

  const getPathWithParams = useCallback(
    (newPathName = pathname, newParams = {}, inherit = true) => {
      const newSearchParams = new URLSearchParams();

      const mergedParams = inherit ? { ...currentParams, ...newParams } : newParams;

      (Object.keys(mergedParams) as Array<keyof typeof mergedParams>).forEach(
        (key) => {
          if (mergedParams[key]) {
            newSearchParams.set(key, mergedParams[key]);
          }
        }
      );

      return newPathName + "?" + newSearchParams.toString();
    },
    [currentParams, pathname]
  );

  const getUrlWithParams = useCallback(
    (newPathName?: string, newParams = {}, inherit = true) => {
      if (typeof window === "undefined") {
        return getPathWithParams(newPathName, newParams, inherit);
      }
      return new URL(
        getPathWithParams(newPathName, newParams, inherit),
        window.location.origin
      ).toString();
    },
    [getPathWithParams]
  );

  const setParams = useCallback(
    (
      newParams: Partial<typeof currentParams>
    ) => {
      setCurrentParams((curr) => ({
        ...curr,
        ...newParams
      }));
    },
    []
  );

  // sync url each 500ms max
  useEffect(() => {
    const handler = setTimeout(() => {
      const newUrl = getPathWithParams(undefined, currentParams);
      router.replace(newUrl);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [currentParams, getPathWithParams, router]);

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
    ]
  );
}
