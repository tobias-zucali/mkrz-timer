import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PeerError } from "peerjs";

import peerConnection from "./peerConnection";


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

export default function usePeer({
  remoteIdParam,
  syncData,
  onAction,
} : {
  peerIdParam: string | null;
  remoteIdParam: string | null;
  syncData: SyncData;
  onAction: (action: SyncAction) => void;
}) {
  const [error, setError] = useState<Error | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [connections, setConnections] = useState<string[]>([]);

  const handleAction = useCallback((data: unknown) => {
    if (data && typeof data === "object" && "type" in data) {
      if (data.type === "sync_data") {
        const action = data as SyncAction;
        onAction(action);
        return;
      }
    }
    console.warn("handleAction: Unknown action received:", data);
  }, [onAction]);

  useEffect(() => {
    const connectRemote = async (remoteId: string) => {
      let peerId
      try {
        peerId = await peerConnection.startPeerSession(remoteId)
      } catch (error) {
        if (error instanceof PeerError) {
          if (error.type === "unavailable-id") {
            peerId = await peerConnection.startPeerSession()
            await peerConnection.connectPeer(remoteId)
            setConnections(peerConnection.getConnections())
            peerConnection.onConnectionReceiveData(remoteId, handleAction)
          }
        } else {
          console.error(error)
          setError(error as Error)
        }
      }
      if (peerId) {
        setPeerId(peerId)
        peerConnection.onIncomingConnection((conn) => {
          setConnections(peerConnection.getConnections())
          peerConnection.onConnectionReceiveData(conn.peer, handleAction)
          peerConnection.send(conn.peer, getSyncAction(syncData))
        })
      }
    }
    if (remoteIdParam) {
      connectRemote(remoteIdParam)
    }
    return () => {
      peerConnection.closePeerSession()
    }
  // initial render only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useMemo(() => ({
    connections,
    error,
    peerId,
  }), [
    connections,
    error,
    peerId,
  ]);
}
