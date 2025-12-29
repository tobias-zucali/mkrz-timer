import { useCallback, useEffect, useMemo, useState } from "react";
import Peer, { PeerError } from "peerjs";

export default function usePeer() {
  const [status, setStatus] = useState<"idle" | "connecting" | "connected">(
    "idle"
  );
  const [peer, setPeer] = useState<Peer | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [error, setError] = useState<PeerError<string> | null>(null);

  useEffect(() => { // making sure to clean up
    if (!peer) return;
    const newPeer = peer;

    return () => {
      newPeer.destroy();
    };
  }, [peer]);

  const connect = useCallback((id?: string) => {
    const newPeer = new Peer(id || "");
    setPeer(newPeer);
    setStatus("connecting");
    if (error) {
      setError(null);
    }

    newPeer.on("open", (id) => {
      console.log("peer connected:", id);
      setPeerId(id);
      setStatus("connected");
    });

    newPeer.on("error", (err) => {
      console.error("Peer error:", err);
      setError(err);
      setStatus("idle");
      setPeer(null);
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
  }, [error]);

  const disconnect = useCallback(() => {
    setPeer(null);
  }, []);

  return useMemo(() => ({
    connect,
    disconnect,
    error,
    peer,
    peerId,
    status,
  }), [
    connect,
    disconnect,
    error,
    peer,
    peerId,
    status,
  ]);
}
