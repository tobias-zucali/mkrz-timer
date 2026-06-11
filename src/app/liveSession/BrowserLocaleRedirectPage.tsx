import { Suspense } from "react"

import RedirectCurrentPathToLocale from "@/i18n/RedirectCurrentPathToLocale"

export default function BrowserLocaleRedirectPage() {
  return (
    <Suspense fallback={null}>
      <RedirectCurrentPathToLocale />
    </Suspense>
  )
}
