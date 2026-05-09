const getPeerPath = () => process.env.NEXT_PUBLIC_PEERJS_PATH || "/"

export const getPeerServerBaseUrl = () => {
  const host = process.env.NEXT_PUBLIC_PEERJS_HOST
  if (!host) {
    return null
  }

  const secure = process.env.NEXT_PUBLIC_PEERJS_SECURE === "true"
  const port = Number(process.env.NEXT_PUBLIC_PEERJS_PORT)
  const protocol = secure ? "https" : "http"
  const portSegment = Number.isFinite(port) ? `:${port}` : ""
  const path = getPeerPath()
  const pathSegment = path === "/" ? "" : path

  return `${protocol}://${host}${portSegment}${pathSegment}`
}

export const getPeerServerLabel = () => {
  const baseUrl = getPeerServerBaseUrl()
  if (!baseUrl) {
    return "PeerJS: cloud"
  }
  return `PeerJS: ${baseUrl}`
}

export const getPeerServerReachabilityUrl = () => {
  const baseUrl = getPeerServerBaseUrl()
  if (!baseUrl) {
    return null
  }
  return `${baseUrl}/peerjs/id`
}
