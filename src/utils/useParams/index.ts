import { useCallback, useMemo } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';

export default function useParams() {
  const searchParams = useSearchParams();
  const pathname = usePathname()
  const router = useRouter();

  const isSearchParamsEmpty = searchParams.size === 0;

  const params = useMemo(() => ({
    m: searchParams.get('m') || '01',
    s: searchParams.get('s') || '00',
    title: searchParams.get('title') || '',
    bg: searchParams.get('bg') || '#000000',
    fg: searchParams.get('fg') || '#ffffff',
    p: searchParams.get('p') || '#d61f69',
  }), [searchParams]);

  const getPathWithParams = useCallback((newPathName = pathname, newParams = {}) => {
    const newSearchParams = new URLSearchParams({
      ...params,
      ...newParams,
    });
    return newPathName + '?' + newSearchParams.toString()
  }, [params, pathname]);

  const getUrlWithParams = useCallback((newPathName?: string, newParams = {}) => {
    if (typeof window === 'undefined') {
      return getPathWithParams(newPathName, newParams);
    }
    return new URL(getPathWithParams(newPathName, newParams), window.location.origin).toString();
  }, [getPathWithParams]);

  const setParams = useCallback(
    (newParams: Record<string, string>, push: boolean = isSearchParamsEmpty) => {
      const newUrl = getPathWithParams(undefined, newParams);
      if (push) {
        router.push(newUrl);
      } else {
        router.replace(newUrl);
      }
    },
    [getPathWithParams, router, isSearchParamsEmpty]
  )
  return useMemo(() => ({
    params,
    setParams,
    getPathWithParams,
    getUrlWithParams,
    isSearchParamsEmpty,
  }), [params, setParams, getPathWithParams, getUrlWithParams, isSearchParamsEmpty]);
}
