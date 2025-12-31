import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Peer, { DataConnection, PeerError } from "peerjs";


export type SyncData = {
  m: string;
  s: string;
  title: string;
  bg: string;
  fg: string;
  pc: string;
};

export type SyncAction = {
  type: "sync_data";
  data: SyncData;
};

const getSyncAction = (data: SyncData): SyncAction => ({
  type: "sync_data",
  data,
});

export default function usePeer(
  peerIdParam: string | null,
  remoteIdParam: string | null,
  syncData: SyncData,
) {
  const [status, setStatus] = useState<"idle" | "connecting" | "connected">(
    "idle"
  );
  const [peer, setPeer] = useState<Peer | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [error, setError] = useState<PeerError<string> | null>(null);
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [remote, setRemote] = useState<DataConnection | null>(null);
  const [mode, setMode] = useState<"client" | "remote" | null>(null);
  const syncDataRef = useRef(syncData);

  useEffect(() => {
    if (remoteIdParam) {
      connectToRemote(remoteIdParam);
    } else if (peerIdParam) {
      connect(peerIdParam);
    }
  // initial render only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    syncDataRef.current = syncData;
    const SyncAction = getSyncAction(syncData);
    connections.forEach((conn) => {
      conn.send(SyncAction);
    });
  }, [syncData, connections]);

  useEffect(() => { // making sure to clean up
    if (!peer) return;
    const newPeer = peer;

    return () => {
      newPeer.destroy();
    };
  }, [peer]);

  const removeConnection = (connection: DataConnection) => {
    setConnections((prev) =>
      prev.filter((conn) => conn.peer !== connection.peer)
    );
  };

  useEffect(() => {
    const interval = setInterval(() => {
      for (const conn of connections) {
        if (!conn.peerConnection ||conn.peerConnection.iceConnectionState !== "connected") {
          console.log("Connection lost:", conn.peer);
          removeConnection(conn);
          continue;
        }
      }
      if (peer) {
        if (peer.disconnected) {
          peer.reconnect();
        } else if (remote && remote.peerConnection.iceConnectionState !== "connected") {
          // ToDo: handle remote disconnection properly
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [connections, peer, remote]);

  const _connect = useCallback((newPeerId?: string | null, onConnect?: (id: string, peer: Peer) => void) => {
    if (status !== "idle") {
      console.warn("Peer is already connected or connecting");
      return;
    }
    const newPeer = new Peer(newPeerId || "");
    setPeer(newPeer);
    setStatus("connecting");
    if (error) {
      setError(null);
    }

    newPeer.on("open", (id) => {
      console.log("peer connected:", id);
      setPeerId(id);
      setStatus("connected");
      onConnect?.(id, newPeer);
    });

    newPeer.on("connection", (connection) => {
      console.log("new connection:", connection);

      connection.on("open", () => {
        console.log("Connection opened with peer:", connection.peer);
        setConnections((prev) => ([...(prev || []), connection]));
      });

      connection.on("data", (data) => {
        console.log("Connection data:", data);
      });

      connection.on("close", () => {
        console.log("Connection closed with peer:", connection.peer);
        removeConnection(connection);
      });

      connection.on("error", (err) => {
        console.error("Connection error:", err);
      });
    });

    newPeer.on("error", (err) => {
      console.error("Peer error:", err);
      setError(err);
      setStatus("idle");
    });

    newPeer.on("call", (conn) => {
      console.log("Call:", conn);
    });

    newPeer.on("close", () => {
      console.log("Closed connection");
      setPeerId(null);
      setStatus("idle");
    });

    newPeer.on("disconnected", (conn) => {
      console.log("Disconnected:", conn);
    });
  }, [error, status]);

  const connect = useCallback((newPeerId?: string | null, onConnect?: (id: string, peer: Peer) => void) => {
    setMode("remote");
    console.log(" Connecting as remote peer...");
    _connect(newPeerId, onConnect);
  }, [_connect]);

  const connectToRemote = useCallback((remoteId: string) => {
    setMode("client");
    console.log(" Connecting as client to remote peer:", remoteId);
    _connect(null, (_id, peer) => { 
      const connection = peer.connect(remoteId);
      setRemote(connection);

      connection.on("open", () => {
        console.log("Connected to remote:", remoteId);
      });

      connection.on("error", (err) => {
        console.error("Remote error:", err);
      });

      connection.on("close", () => {
        console.log("Connection closed with remote:", remoteId);
      });

      connection.on("data", (data) => {
        console.log("Remote data:", data);
      });
    });
  }, [_connect]);

  const disconnect = useCallback(() => {
    setPeer(null);
  }, []);

  return useMemo(() => ({
    connect,
    connections,
    connectToRemote,
    disconnect,
    error,
    peer,
    peerId,
    remote,
    status,
    isClient: mode === "client",
    isRemote: mode === "remote",
  }), [
    connect,
    connections,
    connectToRemote,
    disconnect,
    error,
    peer,
    peerId,
    remote,
    status,
    mode,
  ]);
}
