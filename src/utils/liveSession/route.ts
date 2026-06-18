import type { AppLocale } from "../../i18n/config.ts"
import {
  legacyRemoteRoutePrefixes,
  remoteRoutePrefixes,
} from "../../routing/remotePaths.ts"
import type { RemoteAccessRole } from "../../shared/liveSession/types.ts"
import { stripLocalePrefix } from "../../i18n/locale.ts"
import { normalizeRemoteAccessToken } from "../../shared/security/input.ts"

export type RemoteRoute =
  | {
      isRemote: false
      role: null
      token: null
    }
  | {
      isRemote: true
      role: RemoteAccessRole
      token: string | null
    }

function getRoleForPath(pathname: string): RemoteAccessRole | null {
  if (
    pathname === remoteRoutePrefixes.control ||
    pathname.startsWith(`${remoteRoutePrefixes.control}/`) ||
    pathname === legacyRemoteRoutePrefixes.control ||
    pathname.startsWith(`${legacyRemoteRoutePrefixes.control}/`)
  ) {
    return "control"
  }

  if (
    pathname === remoteRoutePrefixes.readonly ||
    pathname.startsWith(`${remoteRoutePrefixes.readonly}/`) ||
    pathname === legacyRemoteRoutePrefixes.readonly ||
    pathname.startsWith(`${legacyRemoteRoutePrefixes.readonly}/`)
  ) {
    return "readonly"
  }

  return null
}

function getMatchedPathPrefix(pathname: string) {
  const prefixes = [
    remoteRoutePrefixes.control,
    remoteRoutePrefixes.readonly,
    legacyRemoteRoutePrefixes.control,
    legacyRemoteRoutePrefixes.readonly,
  ] as const

  return (
    prefixes.find(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    ) ?? null
  )
}

export function getRemotePathPrefix(role: RemoteAccessRole) {
  return remoteRoutePrefixes[role]
}

export function buildRemotePath({
  locale,
  role,
  token,
}: {
  locale?: AppLocale
  role: RemoteAccessRole
  token: string
}) {
  const path = `${getRemotePathPrefix(role)}/${token}`

  return locale ? `/${locale}${path}` : path
}

export function parseRemoteRoute(pathname: string): RemoteRoute {
  const normalizedPathname = stripLocalePrefix(pathname)
  const role = getRoleForPath(normalizedPathname)
  if (role === null) {
    return {
      isRemote: false,
      role: null,
      token: null,
    }
  }

  const matchedPrefix = getMatchedPathPrefix(normalizedPathname)
  const suffix =
    matchedPrefix === null
      ? ""
      : normalizedPathname.slice(matchedPrefix.length).replace(/^\/+/, "")
  const token = suffix.includes("/") ? null : normalizeRemoteAccessToken(suffix)

  return {
    isRemote: true,
    role,
    token,
  }
}
