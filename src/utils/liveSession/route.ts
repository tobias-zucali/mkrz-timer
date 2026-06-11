import type { AppLocale } from "../../i18n/config.ts"
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

const REMOTE_ROUTE_PREFIXES = {
  control: "/control",
  readonly: "/view",
} satisfies Record<RemoteAccessRole, string>

function getRoleForPath(pathname: string): RemoteAccessRole | null {
  if (
    pathname === REMOTE_ROUTE_PREFIXES.control ||
    pathname.startsWith(`${REMOTE_ROUTE_PREFIXES.control}/`)
  ) {
    return "control"
  }

  if (
    pathname === REMOTE_ROUTE_PREFIXES.readonly ||
    pathname.startsWith(`${REMOTE_ROUTE_PREFIXES.readonly}/`)
  ) {
    return "readonly"
  }

  return null
}

export function getRemotePathPrefix(role: RemoteAccessRole) {
  return REMOTE_ROUTE_PREFIXES[role]
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
  const role = getRoleForPath(stripLocalePrefix(pathname))
  if (role === null) {
    return {
      isRemote: false,
      role: null,
      token: null,
    }
  }

  const prefix = getRemotePathPrefix(role)
  const suffix = stripLocalePrefix(pathname)
    .slice(prefix.length)
    .replace(/^\/+/, "")
  const token = suffix.includes("/") ? null : normalizeRemoteAccessToken(suffix)

  return {
    isRemote: true,
    role,
    token,
  }
}
