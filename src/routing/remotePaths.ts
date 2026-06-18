import { appLocales } from "../i18n/config.ts"
import type { RemoteAccessRole } from "@/shared/liveSession/types"

export const remoteRoutePrefixes = {
  control: "/manage",
  readonly: "/join",
} as const satisfies Record<RemoteAccessRole, string>

export const legacyRemoteRoutePrefixes = {
  control: "/control",
  readonly: "/view",
} as const satisfies Record<RemoteAccessRole, string>

export function buildRemoteRewrites(locales: readonly string[] = appLocales) {
  const localeGroup = locales.join("|")

  return [
    {
      destination: remoteRoutePrefixes.readonly,
      source: `${legacyRemoteRoutePrefixes.readonly}/:token+`,
    },
    {
      destination: remoteRoutePrefixes.control,
      source: `${legacyRemoteRoutePrefixes.control}/:token+`,
    },
    {
      destination: remoteRoutePrefixes.readonly,
      source: `${remoteRoutePrefixes.readonly}/:token+`,
    },
    {
      destination: remoteRoutePrefixes.control,
      source: `${remoteRoutePrefixes.control}/:token+`,
    },
    {
      destination: `/:locale${remoteRoutePrefixes.readonly}`,
      source: `/:locale(${localeGroup})${legacyRemoteRoutePrefixes.readonly}/:token+`,
    },
    {
      destination: `/:locale${remoteRoutePrefixes.control}`,
      source: `/:locale(${localeGroup})${legacyRemoteRoutePrefixes.control}/:token+`,
    },
    {
      destination: `/:locale${remoteRoutePrefixes.readonly}`,
      source: `/:locale(${localeGroup})${remoteRoutePrefixes.readonly}/:token+`,
    },
    {
      destination: `/:locale${remoteRoutePrefixes.control}`,
      source: `/:locale(${localeGroup})${remoteRoutePrefixes.control}/:token+`,
    },
  ]
}
