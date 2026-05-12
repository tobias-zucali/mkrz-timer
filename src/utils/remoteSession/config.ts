const normalizePath = (value: string) =>
  value.endsWith("/") ? value.slice(0, -1) : value

const stripRelayPath = (value: string) => value.replace(/\/ws$/, "")

export const getRemoteRelayWebSocketUrl = () => {
  const configuredUrl = process.env.NEXT_PUBLIC_REMOTE_WS_URL
  if (configuredUrl) {
    return normalizePath(configuredUrl)
  }

  if (typeof window === "undefined") {
    return null
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
  return `${protocol}//${window.location.host}/ws`
}

export const getRemoteRelayHttpBaseUrl = () => {
  const wsUrl = getRemoteRelayWebSocketUrl()
  if (!wsUrl) {
    return null
  }

  if (wsUrl.startsWith("wss://")) {
    return stripRelayPath(wsUrl.replace(/^wss:\/\//, "https://"))
  }

  if (wsUrl.startsWith("ws://")) {
    return stripRelayPath(wsUrl.replace(/^ws:\/\//, "http://"))
  }

  return null
}

export const getRemoteRelayLabel = () => {
  const baseUrl = getRemoteRelayHttpBaseUrl()
  return baseUrl ? `Relay: ${baseUrl}` : "Relay: unavailable"
}

export const getRemoteRelayHealthcheckUrl = () => {
  const baseUrl = getRemoteRelayHttpBaseUrl()
  return baseUrl ? `${baseUrl}/health` : null
}
