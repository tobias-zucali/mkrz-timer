import { useCallback, useMemo } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";

export default function useParams() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const isSearchParamsEmpty = searchParams.size === 0;

  const params = useMemo(
    () => ({
      m: searchParams.get("m") || "01",
      s: searchParams.get("s") || "00",
      title: searchParams.get("title") || "",
      bg: searchParams.get("bg") || "#000000",
      fg: searchParams.get("fg") || "#ffffff",
      p: searchParams.get("p") || "#d61f69",
      r: searchParams.get("r") || "", // remote peer id
      c: searchParams.get("c") || "", // client peer id
    }),
    [searchParams]
  );

  const getPathWithParams = useCallback(
    (newPathName = pathname, newParams = {}, inherit = true) => {
      const newSearchParams = new URLSearchParams();

      const mergedParams = inherit ? { ...params, ...newParams } : newParams;

      (Object.keys(mergedParams) as Array<keyof typeof mergedParams>).forEach(
        (key) => {
          if (mergedParams[key]) {
            newSearchParams.set(key, mergedParams[key]);
          }
        }
      );

      return newPathName + "?" + newSearchParams.toString();
    },
    [params, pathname]
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
      newParams: Record<string, string>,
      push: boolean = isSearchParamsEmpty
    ) => {
      const newUrl = getPathWithParams(undefined, newParams);
      if (push) {
        router.push(newUrl);
      } else {
        router.replace(newUrl);
      }
    },
    [getPathWithParams, router, isSearchParamsEmpty]
  );

  return useMemo(
    () => ({
      params,
      setParams,
      getPathWithParams,
      getUrlWithParams,
      isSearchParamsEmpty,
    }),
    [
      params,
      setParams,
      getPathWithParams,
      getUrlWithParams,
      isSearchParamsEmpty,
    ]
  );
}
