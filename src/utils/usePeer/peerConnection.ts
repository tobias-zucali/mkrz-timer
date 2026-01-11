import Peer, { DataConnection, PeerErrorType, PeerError } from "peerjs";

let peer: Peer | undefined;

const connectionMap: Map<string, DataConnection> = new Map<
  string,
  DataConnection
>();

const initializeConnection = (conn: DataConnection, {
    onError,
    onReceiveData,
    onConnectionClose,
    onOpen,
  }: {
    onError: (error: Error, id?: string) => void;
    onReceiveData: (id: string, data: unknown) => void;
    onConnectionClose?: (id: string) => void;
    onOpen?: (id: string) => void;
  }) => {
  const id = conn.peer
  connectionMap.set(id, conn);
  onOpen?.(id);

  conn.on("close", () => {
    console.log("Connection closed:", id);
    connectionMap.delete(id);
    onConnectionClose?.(id);
  });
  conn.on("data", (data) => {
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
  }: {
    id?: string;
    onError: (error: Error, id?: string) => void;
    onConnection: (id: string) => void;
    onReceiveData: (id: string, data: unknown) => void;
    onClose?: (id: string) => void;
    onConnectionClose?: (id: string) => void;
  }) =>
    new Promise<string>((resolve, reject) => {
      let isResolved = false;
      try {
        let peerId = id;
        peer = new Peer(peerId);
        peer
          .on("open", (id) => {
            console.log("PeerSession Open:", id);
            peerId = id;
            resolve(id);
            isResolved = true;
          })
          .on("error", (error) => {
            console.log("PeerSession Error:", error);
            if (isResolved) {
              onError?.(error);
            }
            reject(error);
            isResolved = true;
          })
          .on("close", () => {
            console.log("PeerSession Closed:", peerId);
            onClose?.(peerId);
          })
          .on("connection", (conn) => {
            console.log("PeerSession incoming connection:", conn.peer);
            conn.on("open", () => {
              initializeConnection(conn, {
                onError,
                onReceiveData,
                onConnectionClose,
              })
              onConnection?.(conn.peer);
            })
          });
      } catch (err) {
        console.log(err);
        reject(err);
        isResolved = true;
      }
    }),
  closePeerSession: () =>
    new Promise<void>((resolve, reject) => {
      try {
        if (peer) {
          peer.destroy();
          peer = undefined;
        }
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
              connectionMap.set(id, conn);
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
  send: (id: string, data: unknown): Promise<void> =>
    new Promise((resolve, reject) => {
      if (!connectionMap.has(id)) {
        reject(new Error("Connection didn't exist"));
      }
      try {
        const conn = connectionMap.get(id);
        if (conn) {
          conn.send(data);
        }
      } catch (err) {
        reject(err);
      }
      resolve();
    }),
  sendAll: async (data: unknown) =>
    Promise.all(
      connectionMap.keys().map((id) => peerConnection.send(id, data))
    ),
  getConnections: () => {
    const connections = connectionMap.keys().toArray();
    console.log("Current connections:", connections);
    return connections;
  },
};

export default peerConnection;
