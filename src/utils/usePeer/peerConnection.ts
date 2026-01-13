import Peer, { DataConnection, PeerErrorType, PeerError } from "peerjs";

let peer: Peer | undefined;

const connectionMap = new Map<
  string,
  {
    lastPing: number;
    conn: DataConnection;
    isAlive: boolean;
  }
>();

const pingAction = {
  type: "ping",
};

const pongAction = {
  type: "pong",
};

const ALIVE_TIMEOUT = 2000; // ms
const PING_INTERVAL = 1000; // ms

const initializeConnection = (conn: DataConnection, {
    onError,
    onReceiveData,
    onConnectionClose,
    onOpen,
    onConnectionsChange,
  }: {
    onError: (error: Error, id?: string) => void;
    onReceiveData: (id: string, data: unknown) => void;
    onConnectionClose?: (id: string) => void;
    onOpen?: (id: string) => void;
    onConnectionsChange?: (connections: string[]) => void;
  }) => {
  const id = conn.peer
  connectionMap.set(id, {
    lastPing: Date.now(), conn,
    isAlive: true
  });
  onConnectionsChange?.(Array.from(connectionMap.keys()));
  onOpen?.(id);

  conn.on("close", () => {
    console.log("Connection closed:", id);
    connectionMap.delete(id);
    onConnectionsChange?.(Array.from(connectionMap.keys()));
    onConnectionClose?.(id);
  });
  conn.on("data", (data) => {
    if (data && typeof data === "object" && "type" in data) {
      switch(data.type) {
        case "pong":
          connectionMap.set(id, { lastPing: Date.now(), conn, isAlive: true });
          return;
        case "ping":
          connectionMap.set(id, { lastPing: Date.now(), conn, isAlive: true });
          conn.send(pongAction);
          return;
      }
    }
    console.log("Incoming data:", id, data);
    onReceiveData?.(id, data);
  });
  conn.on("error", (error) => {
    console.log("Connection Error:", error, id);
    onError?.(error, id);
  });
  conn.on("iceStateChanged", (state) => {
    console.log("Connection state change:", state, id);
  });
}

const peerConnection = {
  getPeer: () => peer,
  startPeerSession: ({
    id = "",
    onError,
    onConnection,
    onReceiveData,
    onConnectionClose,
    onClose,
    onConnectionsChange,
  }: {
    id?: string;
    onError: (error: Error, id?: string) => void;
    onConnection: (id: string) => void;
    onReceiveData: (id: string, data: unknown) => void;
    onClose?: (id: string) => void;
    onConnectionClose?: (id: string) => void;
    onConnectionsChange?: (connections: string[]) => void;
  }) =>
    new Promise<string>((resolve, reject) => {
      let isHandled = false;
      let interval: number;
      try {
        let peerId = id;
        peer = new Peer(peerId);
        peer
          .on("open", (id) => {
            console.log("PeerSession Open:", id);
            peerId = id;
            resolve(id);
            isHandled = true;

            interval = window.setInterval(() => {
              const now = Date.now();
              for (const { conn, lastPing } of connectionMap.values()) {
                if (now - lastPing >= PING_INTERVAL) {
                  conn.send(pingAction);
                }
              }

              let connectionsChanged = false;
              for (const [id, { conn, lastPing, isAlive }] of connectionMap.entries()) {
                if (now - lastPing > ALIVE_TIMEOUT) {
                  if (isAlive === true) {
                    console.log("Connection timed out:", id);
                    connectionMap.set(id, { lastPing, conn: conn, isAlive: false });
                    connectionsChanged = true;
                  }
                } else {
                  if (isAlive === false) {
                    connectionMap.set(id, { lastPing, conn: conn, isAlive: true });
                    console.log("Connection alive again:", id);
                    connectionsChanged = true;
                  }
                }
              }
              if (connectionsChanged) {
                onConnectionsChange?.(peerConnection.getConnections());
              }
            }, PING_INTERVAL);
          })
          .on("error", (error) => {
            console.log("PeerSession Error:", error);
            if (isHandled) {
              onError?.(error);
            }
            reject(error);
            isHandled = true;
          })
          .on("close", () => {
            console.log("PeerSession Closed:", peerId);
            onClose?.(peerId);
            window.clearInterval(interval);
          })
          .on("connection", (conn) => {
            console.log("PeerSession incoming connection:", conn.peer);
            conn.on("open", () => {
              initializeConnection(conn, {
                onError,
                onReceiveData,
                onConnectionClose,
                onConnectionsChange,
              })
              onConnection?.(conn.peer);
            })
          });
      } catch (err) {
        console.log(err);
        reject(err);
        isHandled = true;
      }
    }),
  closePeerSession: () =>
    new Promise<void>((resolve, reject) => {
      try {
        if (peer) {
          peer.destroy();
          peer = undefined;
        }
        connectionMap.clear();
        resolve();
      } catch (err) {
        console.log(err);
        reject(err);
      }
    }),
  connectPeer: (id: string, peerCallbacks: Parameters<typeof initializeConnection>[1]) =>
    new Promise<void>((resolve, reject) => {
      if (!peer) {
        reject(new Error("Peer doesn't start yet"));
        return;
      }
      if (connectionMap.has(id)) {
        reject(new Error("Connection existed"));
        return;
      }
      try {
        const conn = peer.connect(id, { reliable: true });
        if (!conn) {
          reject(new Error("Connection can't be established"));
        } else {
          conn
            .on("open", function () {
              console.log("Connect to: " + id);
              peer?.removeListener("error", handlePeerError);
              initializeConnection(conn, peerCallbacks)
              resolve();
            })
            .on("error", function (err) {
              console.log(err);
              peer?.removeListener("error", handlePeerError);
              reject(err);
            });

          // When the connection fails due to expiry, the error gets emmitted
          // to the peer instead of to the connection.
          // We need to handle this here to be able to fulfill the Promise.
          const handlePeerError = (err: PeerError<`${PeerErrorType}`>) => {
            if (err.type === "peer-unavailable") {
              const messageSplit = err.message.split(" ");
              const peerId = messageSplit[messageSplit.length - 1];
              if (id === peerId) reject(err);
            }
          };
          peer.on("error", handlePeerError);
        }
      } catch (err) {
        reject(err);
      }
    }),
  send: async (id: string, data: unknown) => {
      if (!connectionMap.has(id)) {
        throw new Error("Connection didn't exist");
      }
      const connectionInfo = connectionMap.get(id);
      if (connectionInfo) {
        return peerConnection.sendToConn(connectionInfo.conn, data);
      }
    },
  sendToConn: (conn: DataConnection, data: unknown): Promise<void> =>
    new Promise((resolve, reject) => {
      try {
        conn.send(data);
      } catch (err) {
        reject(err);
      }
      resolve();
    }),
  sendAll: async (data: unknown) =>
    Promise.all(
      peerConnection.getConnections().map((id) => peerConnection.send(id, data))
    ),
  getConnections: () => {
    const connectionsAlive: string[] = [];
    for (const [id, { isAlive }] of connectionMap.entries()) {
      if (isAlive) {
        connectionsAlive.push(id);
      }
    }
    return connectionsAlive;
  },
};

export default peerConnection;
