import Peer, {
  DataConnection,
  PeerErrorType,
  PeerError,
  type PeerOptions,
} from "peerjs"
import debug from "@/utils/debug"

type ConnectionInfo = {
  lastPing: number
  conn: DataConnection
  isAlive: boolean
}

export type PeerConnectionDetails = {
  id: string
  isAlive: boolean
  isOpen: boolean
  lastPing: number
  webRtcConnectionState: string
  webRtcIceConnectionState: string
  webRtcSignalingState: string
}

const getPeerOptions = (): PeerOptions | undefined => {
  const host = process.env.NEXT_PUBLIC_PEERJS_HOST
  if (!host) {
    return
  }

  const port = Number(process.env.NEXT_PUBLIC_PEERJS_PORT)

  return {
    host,
    port: Number.isFinite(port) ? port : undefined,
    path: process.env.NEXT_PUBLIC_PEERJS_PATH || "/",
    secure: process.env.NEXT_PUBLIC_PEERJS_SECURE === "true",
  }
}

class PeerConnection {
  private readonly RECOVERABLE_SESSION_ERRORS = new Set<`${PeerErrorType}`>([
    PeerErrorType.Network,
    PeerErrorType.ServerError,
    PeerErrorType.SocketClosed,
    PeerErrorType.SocketError,
  ])

  private peer: Peer | undefined
  private connectionMap = new Map<string, ConnectionInfo>()
  private locallyClosedConnections = new WeakSet<DataConnection>()
  private healthInterval: number | undefined = undefined
  private reconnectInterval: number | undefined = undefined

  private setConnection(conn: DataConnection, isAlive = true) {
    const prevConn = this.connectionMap.get(conn.peer)
    if (prevConn && prevConn.conn !== conn) {
      this.locallyClosedConnections.add(prevConn.conn)
      prevConn.conn.close()
    }
    this.connectionMap.set(conn.peer, {
      lastPing: Date.now(),
      conn,
      isAlive,
    })
    if (!prevConn || prevConn.isAlive !== isAlive) {
      this.onConnectionsChange(this.getConnections())
    }
  }

  private deleteConnection(
    id: string,
    promoteChange = true,
    expectedConn?: DataConnection,
  ) {
    const connectionInfo = this.connectionMap.get(id)
    if (!connectionInfo) {
      return
    }
    if (expectedConn && connectionInfo.conn !== expectedConn) {
      return
    }
    this.locallyClosedConnections.add(connectionInfo.conn)
    connectionInfo.conn.close()
    this.connectionMap.delete(id)
    if (promoteChange) {
      this.onConnectionsChange(this.getConnections())
    }
  }

  private clearConnections() {
    this.connectionMap.forEach((_value, id) => {
      this.deleteConnection(id, false)
    })
    this.onConnectionsChange(this.getConnections())
  }

  private readonly pingAction = { type: "ping" }
  private readonly pongAction = { type: "pong" }
  private readonly ALIVE_TIMEOUT = 2000 // ms
  private readonly PING_INTERVAL = 1000 // ms

  private readonly onError: (error: Error, id?: string) => void
  private readonly onConnection: (id: string) => void
  private readonly onReceiveData: (id: string, data: unknown) => void
  private readonly onConnectionClose: ((id: string) => void) | undefined
  private readonly onClose: ((id?: string) => void) | undefined
  private readonly onConnectionsChange: (connections: string[]) => void
  private readonly onPeerOpen: () => void

  constructor({
    onPeerOpen,
    onError,
    onConnection,
    onReceiveData,
    onConnectionClose,
    onClose,
    onConnectionsChange,
  }: {
    onPeerOpen: () => void
    onError: (error: Error, id?: string) => void
    onConnection: (id: string) => void
    onReceiveData: (id: string, data: unknown) => void
    onClose?: (id?: string) => void
    onConnectionClose?: (id: string) => void
    onConnectionsChange: (connections: string[]) => void
  }) {
    this.onPeerOpen = onPeerOpen
    this.onError = onError
    this.onConnection = onConnection
    this.onReceiveData = onReceiveData
    this.onConnectionClose = onConnectionClose
    this.onClose = onClose
    this.onConnectionsChange = onConnectionsChange
  }

  private checkConnectionsChanged() {
    const now = Date.now()
    for (const { conn, lastPing } of this.connectionMap.values()) {
      if (now - lastPing >= this.PING_INTERVAL) {
        this.sendToConn(conn, this.pingAction).catch((error) => {
          debug.log("Error sending ping:", error)
        })
      }
    }

    for (const [
      id,
      { conn, lastPing, isAlive },
    ] of this.connectionMap.entries()) {
      if (now - lastPing > this.ALIVE_TIMEOUT) {
        if (isAlive === true) {
          debug.log("Connection timed out:", id)
          this.setConnection(conn, false)
        }
      } else {
        if (isAlive === false) {
          this.setConnection(conn, true)
          debug.log("Connection alive again:", id)
        }
      }
    }
  }

  async createPeer(id?: string, force = false) {
    const createPeerPromise = new Promise<string>(async (resolve, reject) => {
      let isInitialized = false
      try {
        if (this.peer) {
          if (force) {
            await this.closePeerSession(false)
          } else {
            reject("Peer already exists")
            return
          }
        }

        window.clearInterval(this.reconnectInterval)
        this.reconnectInterval = undefined

        const peerOptions = getPeerOptions()
        const peer = id
          ? new Peer(id, peerOptions)
          : peerOptions
            ? new Peer(peerOptions)
            : new Peer()
        this.peer = peer
        peer
          .on("open", (id) => {
            if (this.peer !== peer) {
              return
            }
            debug.log("PeerSession Open:", id)
            window.clearInterval(this.healthInterval)
            this.healthInterval = window.setInterval(
              () => this.checkConnectionsChanged(),
              this.PING_INTERVAL,
            )
            isInitialized = true
            this.onPeerOpen?.()

            window.addEventListener("beforeunload", this.beforeUnload)
            resolve(id)
          })
          .on("error", (error) => {
            if (this.peer !== peer) {
              return
            }
            debug.log("PeerSession Error:", error)
            window.clearInterval(this.healthInterval)
            if (isInitialized) {
              this.onError?.(error)
            } else {
              reject(error)
            }
          })
          .on("close", () => {
            if (this.peer !== peer) {
              return
            }
            debug.log("PeerSession Closed")
            window.clearInterval(this.healthInterval)
            window.clearInterval(this.reconnectInterval)
            window.removeEventListener("beforeunload", this.beforeUnload)
            if (isInitialized) {
              this.onClose?.()
            } else {
              reject(new Error("Peer session closed"))
            }
          })
          .on("connection", (conn) => {
            if (this.peer !== peer) {
              conn.close()
              return
            }
            debug.log("PeerSession incoming connection:", conn.peer)
            conn.on("open", () => {
              this.initializeConnection(conn)
              this.onConnection?.(conn.peer)
            })
          })
      } catch (errror) {
        debug.log(errror)
        reject(errror)
      }
    })
    return createPeerPromise
  }

  private initializeConnection(conn: DataConnection) {
    const id = conn.peer
    this.setConnection(conn)

    conn.on("close", () => {
      debug.log("Connection closed:", id)
      const wasLocallyClosed = this.locallyClosedConnections.has(conn)
      this.deleteConnection(id, true, conn)
      if (!wasLocallyClosed) {
        this.onConnectionClose?.(id)
      }
    })
    conn.on("data", (data) => {
      if (data && typeof data === "object" && "type" in data) {
        switch (data.type) {
          case "pong":
            this.setConnection(conn, true)
            return
          case "ping":
            this.setConnection(conn, true)
            this.sendToConn(conn, this.pongAction).catch((error) => {
              debug.log("Error sending pong:", error)
            })
            return
          case "disconnect":
            debug.log("Disconnect from:", id.slice(-4))
            this.deleteConnection(id, true, conn)
            conn.close()
            this.onConnectionClose?.(id)
            return
        }
      }
      debug.log("Incoming data:", id, data)
      this.onReceiveData?.(id, data)
    })
    conn.on("error", (error) => {
      debug.log("Connection Error:", error, id)
      this.onError?.(error, id)
    })
    conn.on("iceStateChanged", (state) => {
      debug.log("Connection state change:", state, id)
    })
  }

  private beforeUnload = () => {
    this.sendAll({ type: "disconnect" }).catch((err) => {
      debug.log("Error sending disconnect on unload:", err)
    })
    this.closePeerSession().catch((err) => {
      debug.log("Error closing peer session on unload:", err)
    })
  }

  public getPeerId() {
    return this.peer?.id
  }

  public async closePeerSession(promoteClose = true): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        window.clearInterval(this.healthInterval)
        window.clearInterval(this.reconnectInterval)
        this.healthInterval = undefined
        this.reconnectInterval = undefined
        window.removeEventListener("beforeunload", this.beforeUnload)
        if (this.peer) {
          const peer = this.peer
          this.peer = undefined
          peer.removeAllListeners()
          peer.destroy()
          if (promoteClose) {
            this.onClose?.()
          }
        }
        this.clearConnections()
        resolve()
      } catch (err) {
        debug.log(err)
        reject(err)
      }
    })
  }

  public async connectPeer(id: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.peer) {
        reject(new Error("Peer doesn't start yet"))
        return
      }
      const existingConnection = this.connectionMap.get(id)
      if (existingConnection?.isAlive) {
        reject(new Error("Connection existed"))
        return
      }
      if (existingConnection) {
        this.deleteConnection(id, false)
      }
      try {
        const conn = this.peer.connect(id, { reliable: true })
        if (!conn) {
          reject(new Error("Connection can't be established"))
        } else {
          conn
            .on("open", () => {
              debug.log("Connect to: " + id)
              this.peer?.removeListener("error", handlePeerError)
              this.initializeConnection(conn)
              resolve()
            })
            .on("error", (err) => {
              debug.log(err)
              this.peer?.removeListener("error", handlePeerError)
              reject(err)
            })

          const handlePeerError = (err: PeerError<`${PeerErrorType}`>) => {
            if (err.type === "peer-unavailable") {
              const messageSplit = err.message.split(" ")
              const peerId = messageSplit[messageSplit.length - 1]
              if (id === peerId) reject(err)
            }
          }
          this.peer.on("error", handlePeerError)
        }
      } catch (err) {
        reject(err)
      }
    })
  }

  public async send(id: string, data: unknown): Promise<void> {
    if (!this.connectionMap.has(id)) {
      throw new Error("Connection didn't exist")
    }
    const connectionInfo = this.connectionMap.get(id)
    if (connectionInfo) {
      return this.sendToConn(connectionInfo.conn, data)
    }
  }

  public async sendToConn(conn: DataConnection, data: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        conn.send(data)
      } catch (err) {
        reject(err)
      }
      resolve()
    })
  }

  public async sendAll(data: unknown): Promise<void[]> {
    return Promise.all(this.getConnections().map((id) => this.send(id, data)))
  }

  public getConnections(): string[] {
    const connectionsAlive: string[] = []
    for (const [id, { isAlive }] of this.connectionMap.entries()) {
      if (isAlive) {
        connectionsAlive.push(id)
      }
    }
    return connectionsAlive
  }

  public getAllConnections(): PeerConnectionDetails[] {
    const connectionsAlive: PeerConnectionDetails[] = []
    for (const [
      id,
      { conn, isAlive, lastPing },
    ] of this.connectionMap.entries()) {
      const rtcConnection = (
        conn as unknown as { peerConnection?: RTCPeerConnection }
      ).peerConnection
      connectionsAlive.push({
        id,
        isAlive,
        isOpen: Boolean(conn.open),
        lastPing,
        webRtcConnectionState: rtcConnection?.connectionState ?? "unknown",
        webRtcIceConnectionState:
          rtcConnection?.iceConnectionState ?? "unknown",
        webRtcSignalingState: rtcConnection?.signalingState ?? "unknown",
      })
    }
    return connectionsAlive
  }
}

export default PeerConnection
