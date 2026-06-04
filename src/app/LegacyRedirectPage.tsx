import { Suspense } from "react"

import RedirectCurrentPathToLocale from "@/i18n/RedirectCurrentPathToLocale"

export default function LegacyRedirectPage() {
  return (
    <Suspense fallback={null}>
      <RedirectCurrentPathToLocale />
    </Suspense>
  )
}
