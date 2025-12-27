import { useCallback, useMemo } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';

export default function useParams() {
  const searchParams = useSearchParams();
  const pathname = usePathname()
  const router = useRouter();

  const params = useMemo(() => ({
    m: searchParams.get('m') || '01',
    s: searchParams.get('s') || '00',
    title: searchParams.get('title') || '',
  }), [searchParams]);

  const getUrlWithParams = useCallback((newParams = {}, newPathName = pathname) => {
    const newSearchParams = new URLSearchParams({
      ...params,
      ...newParams,
    });
    return newPathName + '?' + newSearchParams.toString();
  }, [params, pathname]);

  const setParams = useCallback(
    (newParams: Record<string, string>, push: boolean = false) => {
      const newUrl = getUrlWithParams(newParams);
      if (push) {
        router.push(newUrl);
      } else {
        router.replace(newUrl);
      }
    },
    [getUrlWithParams, router]
  )
  return useMemo(() => ({
    params,
    setParams,
    getUrlWithParams,
  }), [params, setParams, getUrlWithParams]);
}
