import { useCallback, useEffect, useMemo,  useRef,  useState } from "react";
import { PeerError, PeerErrorType } from "peerjs";

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
  const syncDataRef = useRef(syncData);
  syncDataRef.current = syncData;

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

  const connectRemote = async (remoteId: string) => {
    let peerId
    const peerCallbacks = {
      onError: setError,
      onConnection: (id: string) => {
        setConnections(peerConnection.getConnections())
        peerConnection.send(id, getSyncAction(syncDataRef.current))
      },
      onReceiveData: (id: string, data: unknown) => handleAction(data),
      onClose: () => {
        // TODO: Handle if needed
      },
      onConnectionClose: () => setConnections(peerConnection.getConnections()),
    }
    try {
      peerId = await peerConnection.startPeerSession({
        id: remoteId,
        ...peerCallbacks,
      })
    } catch (error) {
      if (error instanceof PeerError) {
        if (error.type === PeerErrorType.UnavailableID) {
          peerId = await peerConnection.startPeerSession(peerCallbacks)
          await peerConnection.connectPeer(remoteId, peerCallbacks)
          setConnections(peerConnection.getConnections())
        }
      } else {
        console.error(error)
        setError(error as Error)
      }
    }
    if (peerId) {
      setPeerId(peerId)
    }
  }

  useEffect(() => {
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
