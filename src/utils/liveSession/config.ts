const normalizePath = (value: string) =>
  value.endsWith("/") ? value.slice(0, -1) : value

const stripRelayPath = (value: string) => value.replace(/\/ws$/, "")

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "0.0.0.0", "localhost", "[::1]"])

const isLoopbackHost = (value: string) => LOOPBACK_HOSTS.has(value)

const resolveRuntimeRelayUrl = (value: string) => {
  if (typeof window === "undefined") {
    return value
  }

  const pageHostname = window.location.hostname
  if (isLoopbackHost(pageHostname)) {
    return value
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(value)
  } catch {
    return value
  }

  if (!isLoopbackHost(parsedUrl.hostname)) {
    return value
  }

  parsedUrl.hostname = pageHostname
  return parsedUrl.toString()
}

export const getRemoteRelayWebSocketUrl = () => {
  const configuredUrl = process.env.NEXT_PUBLIC_REMOTE_WS_URL
  if (configuredUrl) {
    return normalizePath(resolveRuntimeRelayUrl(configuredUrl))
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
