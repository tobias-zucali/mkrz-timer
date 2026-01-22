import Peer, { DataConnection, PeerErrorType, PeerError } from "peerjs"
import debug from "@/utils/debug"

type ConnectionInfo = {
  lastPing: number
  conn: DataConnection
  isAlive: boolean
}

class PeerConnection {
  private peer: Peer | undefined
  private connectionMap = new Map<string, ConnectionInfo>()

  private setConnection(conn: DataConnection, isAlive = true) {
    const prevConn = this.connectionMap.get(conn.peer)
    this.connectionMap.set(conn.peer, {
      lastPing: Date.now(),
      conn,
      isAlive,
    })
    if (!prevConn || prevConn.isAlive !== isAlive) {
      this.onConnectionsChange(this.getConnections())
    }
  }

  private deleteConnection(id: string) {
    this.connectionMap.delete(id)
    this.onConnectionsChange(this.getConnections())
  }

  private clearConnections() {
    this.connectionMap.clear()
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
  private readonly onOpen: () => void

  constructor({
    onOpen,
    onError,
    onConnection,
    onReceiveData,
    onConnectionClose,
    onClose,
    onConnectionsChange,
  }: {
    onOpen: () => void
    onError: (error: Error, id?: string) => void
    onConnection: (id: string) => void
    onReceiveData: (id: string, data: unknown) => void
    onClose?: (id?: string) => void
    onConnectionClose?: (id: string) => void
    onConnectionsChange: (connections: string[]) => void
  }) {
    this.onOpen = onOpen
    this.onError = onError
    this.onConnection = onConnection
    this.onReceiveData = onReceiveData
    this.onConnectionClose = onConnectionClose
    this.onClose = onClose
    this.onConnectionsChange = onConnectionsChange
  }

  async createPeer(id?: string, force = false) {
    const checkConnectionsChanged = () => {
      const now = Date.now()
      for (const { conn, lastPing } of this.connectionMap.values()) {
        if (now - lastPing >= this.PING_INTERVAL) {
          conn.send(this.pingAction)
        }
      }

      for (const [
        id,
        { conn, lastPing, isAlive },
      ] of this.connectionMap.entries()) {
        if ((now - lastPing) > this.ALIVE_TIMEOUT) {
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

    const createPeerPromise = new Promise<string>(async (resolve, reject) => {
      let interval: number
      let isInitialized = false
      try {
        if (this.peer) {
          if (force) {
            await this.closePeerSession()
          } else {
            reject("Peer already exists")
            return
          }
        }
        this.peer = id ? new Peer(id) : new Peer()
        this.peer
          .on("open", (id) => {
            debug.log("PeerSession Open:", id)
            interval = window.setInterval(
              checkConnectionsChanged,
              this.PING_INTERVAL,
            )
            isInitialized = true

            window.addEventListener("beforeunload", this.beforeUnload)
            resolve(id)
          })
          .on("error", (error) => {
            debug.log("PeerSession Error:", error)
            window.clearInterval(interval)
            if (isInitialized) {
              this.onError?.(error)
            } else {
              reject(error)
            }
          })
          .on("close", () => {
            debug.log("PeerSession Closed")
            window.clearInterval(interval)
            window.removeEventListener("beforeunload", this.beforeUnload)
            if (isInitialized) {
              this.onClose?.()
            } else {
              reject(new Error("Peer session closed"))
            }
          })
          .on("connection", (conn) => {
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
    this.onOpen?.()

    conn.on("close", () => {
      debug.log("Connection closed:", id)
      this.deleteConnection(id)
      this.onConnectionClose?.(id)
    })
    conn.on("data", (data) => {
      if (data && typeof data === "object" && "type" in data) {
        switch (data.type) {
          case "pong":
            this.setConnection(conn, true)
            return
          case "ping":
            this.setConnection(conn, true)
            conn.send(this.pongAction)
            return
          case "disconnect":
            debug.log("Disconnect from:", id.slice(-4))
            this.deleteConnection(id)
            conn.close()
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

  public async closePeerSession(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        if (this.peer) {
          this.peer.destroy()
          this.peer = undefined
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
      if (this.connectionMap.has(id)) {
        reject(new Error("Connection existed"))
        return
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

  public getAllConnections() {
    const connectionsAlive: Array<{ id: string; isAlive: boolean }> = []
    for (const [id, { isAlive }] of this.connectionMap.entries()) {
      connectionsAlive.push({ id, isAlive })
    }
    return connectionsAlive
  }
}

export default PeerConnection
