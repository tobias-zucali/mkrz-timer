import { useCallback, useEffect, useMemo,  useRef,  useState } from "react";
import { PeerError, PeerErrorType } from "peerjs";

import peerConnection from "./peerConnection";

export type ClientSyncData = {
  m: string;
  s: string;
  title: string;
  bg: string;
  fg: string;
  pc: string;
};

type SyncData = ClientSyncData & {
  connections: string[];
}

export type SyncAction = {
  type: "sync_data";
  data: Partial<SyncData>;
};

const getSyncAction = (data: Partial<SyncData>): SyncAction => ({
  type: "sync_data",
  data,
});

export default function usePeer({
  remoteIdParam,
  currentSyncData,
  onAction,
} : {
  remoteIdParam: string | null;
  currentSyncData: ClientSyncData;
  onAction: (action: SyncAction) => void;
}) {
  const [error, setError] = useState<Error | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [connections, setConnections] = useState<string[]>([]);

  const isRemoteRef = useRef(false);

  const syncDataRef = useRef(currentSyncData);
  syncDataRef.current = currentSyncData;

  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;

  const syncAll = useCallback((keys?: string[]) => {
    peerConnection.sendAll(getSyncAction({
      ...(keys ? keys.reduce((prev, key) => {
        if (Object.hasOwn(syncDataRef.current, key)) {
          return {
            ...prev,
            [key]: syncDataRef.current[key as keyof ClientSyncData]
          };
        }
        console.warn(`usePeer syncAll: key ${key} not found`, {keys, syncData: syncDataRef.current})
        return prev;
      }, {}) : syncDataRef.current),
      connections: peerConnection.getConnections()
    }))
  }, [])

  const peerCallbacks = useMemo(() => ({
    onError: setError,
    onOpen: () => setConnections(peerConnection.getConnections()),
    onConnection: (id: string) => {
      setConnections(peerConnection.getConnections())
      if (isRemoteRef.current) {
        peerConnection.send(id, getSyncAction({
          ...syncDataRef.current,
          connections: peerConnection.getConnections()
        }))
      }
    },
    onReceiveData: (id: string, data: unknown) => {
      if (data && typeof data === "object" && "type" in data) {
        if (data.type === "sync_data") {
          const action = data as SyncAction;
          const currentConnections = peerConnection.getConnections();
          const peerId = peerConnection.getPeer()?.id;
          action.data.connections?.map((id) => {
            if (id !==peerId && currentConnections.indexOf(id) === -1) {
              peerConnection.connectPeer(id, peerCallbacks)
            }
          })
          onActionRef.current(action);
          return;
        }
      }
      console.warn("handleAction: Unknown action received:", data);
    },
    onClose: (id: string) => {
      isRemoteRef.current = false
      console.log("usePeer onClose", id)
      setConnections(peerConnection.getConnections())
    },
    onConnectionClose: (id: string) => {
      console.log("usePeer onConnectionClose", id)
      setConnections(peerConnection.getConnections())
    },
  }), [])

  const connectRemote = useCallback(async (
    remoteId: string
  ) => {
    let peerId
    try {
      peerId = await peerConnection.startPeerSession({
        id: remoteId,
        ...peerCallbacks,
      })
      isRemoteRef.current = true
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
      isRemoteRef.current = false
    }
    if (peerId) {
      setPeerId(peerId)
    }
    return peerId
  }, [peerCallbacks])

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
    connectRemote,
    connections,
    disconnect: () => peerConnection.closePeerSession(),
    error,
    peerId,
    syncAll,
  }), [
    connectRemote,
    connections,
    error,
    peerId,
    syncAll,
  ]);
}
