import Peer, { DataConnection, PeerErrorType, PeerError } from "peerjs";

class PeerConnection {
  private peer: Peer | undefined;
  private connectionMap = new Map<
    string,
    {
      lastPing: number;
      conn: DataConnection;
      isAlive: boolean;
    }
  >();

  private readonly pingAction = { type: "ping" };
  private readonly pongAction = { type: "pong" };
  private readonly ALIVE_TIMEOUT = 2000; // ms
  private readonly PING_INTERVAL = 1000; // ms

  private readonly onError: (error: Error, id?: string) => void;
  private readonly onConnection: (id: string) => void;
  private readonly onReceiveData: (id: string, data: unknown) => void;
  private readonly onConnectionClose: ((id: string) => void) | undefined;
  private readonly onClose: ((id?: string) => void) | undefined;
  private readonly onConnectionsChange: (connections: string[]) => void;
  private readonly onOpen: () => void;

  constructor({
    onOpen,
    onError,
    onConnection,
    onReceiveData,
    onConnectionClose,
    onClose,
    onConnectionsChange,
  }: {
    onOpen: () => void;
    onError: (error: Error, id?: string) => void;
    onConnection: (id: string) => void;
    onReceiveData: (id: string, data: unknown) => void;
    onClose?: (id?: string) => void;
    onConnectionClose?: (id: string) => void;
    onConnectionsChange: (connections: string[]) => void;
  }) {
    this.onOpen = onOpen;
    this.onError = onError;
    this.onConnection = onConnection;
    this.onReceiveData = onReceiveData;
    this.onConnectionClose = onConnectionClose;
    this.onClose = onClose;
    this.onConnectionsChange = onConnectionsChange;
  };

  async startSession(id?: string) {
    const checkConnectionsChanged = () => {
      const now = Date.now();
      for (const { conn, lastPing } of this.connectionMap.values()) {
        if (now - lastPing >= this.PING_INTERVAL) {
          conn.send(this.pingAction);
        }
      }

      let connectionsChanged = false;
      for (const [
        id,
        { conn, lastPing, isAlive },
      ] of this.connectionMap.entries()) {
        if (now - lastPing > this.ALIVE_TIMEOUT) {
          if (isAlive === true) {
            console.log("Connection timed out:", id);
            this.connectionMap.set(id, {
              lastPing,
              conn: conn,
              isAlive: false,
            });
            connectionsChanged = true;
          }
        } else {
          if (isAlive === false) {
            this.connectionMap.set(id, {
              lastPing,
              conn: conn,
              isAlive: true,
            });
            console.log("Connection alive again:", id);
            connectionsChanged = true;
          }
        }
      }
      if (connectionsChanged) {
        this.onConnectionsChange(this.getConnections());
      }
    }

    return new Promise<string>((resolve, reject) => {
      let interval: number;
      let isInitialized = false;
      try {
        this.peer = id ? new Peer(id) : new Peer();
        this.peer
          .on("open", (id) => {
            console.log("PeerSession Open:", id);
            interval = window.setInterval(checkConnectionsChanged, this.PING_INTERVAL);
            isInitialized = true;

            resolve(id);
          })
          .on("error", (error) => {
            console.log("PeerSession Error:", error);
            window.clearInterval(interval);
            if (isInitialized) {
              this.onError?.(error);
            } else {
              reject(error);
            }
          })
          .on("close", () => {
            console.log("PeerSession Closed");
            window.clearInterval(interval);
            if (isInitialized) {
              this.onClose?.();
            } else {
              reject(new Error("Peer session closed"));
            }
          })
          .on("connection", (conn) => {
            console.log("PeerSession incoming connection:", conn.peer);
            conn.on("open", () => {
              this.initializeConnection(conn);
              this.onConnection?.(conn.peer);
            });
          });
      } catch (errror) {
        console.log(errror);
        reject(errror);
      }
    });
  }

  private initializeConnection(
    conn: DataConnection
  ) {
    const id = conn.peer;
    this.connectionMap.set(id, {
      lastPing: Date.now(),
      conn,
      isAlive: true,
    });
    this.onConnectionsChange(Array.from(this.connectionMap.keys()));
    this.onOpen?.();

    conn.on("close", () => {
      console.log("Connection closed:", id);
      this.connectionMap.delete(id);
      this.onConnectionsChange(Array.from(this.connectionMap.keys()));
      this.onConnectionClose?.(id);
    });
    conn.on("data", (data) => {
      if (data && typeof data === "object" && "type" in data) {
        switch (data.type) {
          case "pong":
            this.connectionMap.set(id, { lastPing: Date.now(), conn, isAlive: true });
            return;
          case "ping":
            this.connectionMap.set(id, { lastPing: Date.now(), conn, isAlive: true });
            conn.send(this.pongAction);
            return;
        }
      }
      console.log("Incoming data:", id, data);
      this.onReceiveData?.(id, data);
    });
    conn.on("error", (error) => {
      console.log("Connection Error:", error, id);
      this.onError?.(error, id);
    });
    conn.on("iceStateChanged", (state) => {
      console.log("Connection state change:", state, id);
    });
  }

  public getPeerId() {
    return this.peer?.id;
  }

  public async closePeerSession(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        if (this.peer) {
          this.peer.destroy();
          this.peer = undefined;
        }
        this.connectionMap.clear();
        resolve();
      } catch (err) {
        console.log(err);
        reject(err);
      }
    });
  }

  public async connectPeer(
    id: string,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.peer) {
        reject(new Error("Peer doesn't start yet"));
        return;
      }
      if (this.connectionMap.has(id)) {
        reject(new Error("Connection existed"));
        return;
      }
      try {
        const conn = this.peer.connect(id, { reliable: true });
        if (!conn) {
          reject(new Error("Connection can't be established"));
        } else {
          conn
            .on("open", () => {
              console.log("Connect to: " + id);
              this.peer?.removeListener("error", handlePeerError);
              this.initializeConnection(conn);
              resolve();
            })
            .on("error", (err) => {
              console.log(err);
              this.peer?.removeListener("error", handlePeerError);
              reject(err);
            });

          const handlePeerError = (err: PeerError<`${PeerErrorType}`>) => {
            if (err.type === "peer-unavailable") {
              const messageSplit = err.message.split(" ");
              const peerId = messageSplit[messageSplit.length - 1];
              if (id === peerId) reject(err);
            }
          };
          this.peer.on("error", handlePeerError);
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  public async send(id: string, data: unknown): Promise<void> {
    if (!this.connectionMap.has(id)) {
      throw new Error("Connection didn't exist");
    }
    const connectionInfo = this.connectionMap.get(id);
    if (connectionInfo) {
      return this.sendToConn(connectionInfo.conn, data);
    }
  }

  public async sendToConn(conn: DataConnection, data: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        conn.send(data);
      } catch (err) {
        reject(err);
      }
      resolve();
    });
  }

  public async sendAll(data: unknown): Promise<void[]> {
    return Promise.all(
      this.getConnections().map((id) => this.send(id, data))
    );
  }

  public getConnections(): string[] {
    const connectionsAlive: string[] = [];
    for (const [id, { isAlive }] of this.connectionMap.entries()) {
      if (isAlive) {
        connectionsAlive.push(id);
      }
    }
    return connectionsAlive;
  }
}

export default PeerConnection;
