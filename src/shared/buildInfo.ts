const unknownBuildId = "dev"

export function getBuildId(value?: string | null) {
  const normalizedValue = value?.trim()

  if (!normalizedValue) {
    return unknownBuildId
  }

  return normalizedValue
}

export function formatBuildId(value?: string | null) {
  const buildId = getBuildId(value)

  if (buildId === unknownBuildId) {
    return buildId
  }

  return buildId.slice(0, 12)
}

export function getPublicBuildInfo() {
  const buildId = getBuildId(process.env.NEXT_PUBLIC_BUILD_ID)

  return {
    buildId,
    buildLabel: formatBuildId(buildId),
  }
}

export function getRelayBuildInfo() {
  const buildId = getBuildId(process.env.APP_BUILD_ID)

  return {
    buildId,
    commit: buildId,
  }
}
