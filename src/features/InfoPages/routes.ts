import type { AppLocale } from "@/i18n/config"
import { localizePathname } from "@/i18n/locale"

import type { InfoPageSlug } from "./content"

export function getInfoPagePath(locale: AppLocale, slug: InfoPageSlug) {
  return localizePathname(`/${slug}`, locale)
}
