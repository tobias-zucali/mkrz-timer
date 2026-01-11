import { useCallback, useEffect, useMemo,  useRef,  useState } from "react";
import { PeerError, PeerErrorType } from "peerjs";

import peerConnection from "./peerConnection";
import { TimerState } from "@/utils/useTimer";

export type SyncParams = {
  m: string;
  s: string;
  title: string;
  bg: string;
  fg: string;
  pc: string;
};

const getSyncAction = ({
  params,
  connections,
  state
}: {
  params: Partial<SyncParams>;
  connections: string[];
  state?: TimerState;
}) => ({
  type: "sync",
  params,
  connections,
  state,
});

export type SyncAction = ReturnType<typeof getSyncAction> ;

export default function usePeer({
  remoteIdParam,
  syncParamsRef,
  syncStateRef,
  onHandleAction,
} : {
  remoteIdParam: string | null;
  syncParamsRef: React.RefObject<SyncParams>;
  syncStateRef: React.RefObject<TimerState>;
  onHandleAction: (action: SyncAction) => void;
}) {
  const [error, setError] = useState<Error | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [connections, setConnections] = useState<string[]>([]);

  const isRemoteRef = useRef(false);

  const onHandleActionRef = useRef(onHandleAction);
  onHandleActionRef.current = onHandleAction;

  const syncAll = useCallback(({
    keys,
    state = {},
  }: {
    keys?: string[]
    state?: Partial<TimerState>,
  }) => {
    peerConnection.sendAll(getSyncAction({
      params: {
        ...(keys ? keys.reduce((prev, key) => {
          if (Object.hasOwn(syncParamsRef.current, key)) {
            return {
              ...prev,
              [key]: syncParamsRef.current[key as keyof SyncParams]
            };
          }
          console.warn(`usePeer syncAll: key ${key} not found`, {keys, syncParams: syncParamsRef.current})
          return prev;
        }, {}) : syncParamsRef.current),
      },
      connections: peerConnection.getConnections(),
      state: {
        ...state,
        ...syncStateRef.current,
      },
    }));
  }, [syncParamsRef, syncStateRef])

  const peerCallbacks = useMemo(() => ({
    onError: setError,
    onOpen: () => setConnections(peerConnection.getConnections()),
    onConnection: (id: string) => {
      setConnections(peerConnection.getConnections())
      if (isRemoteRef.current) {
        peerConnection.send(id, getSyncAction({
          params: syncParamsRef.current,
          connections: peerConnection.getConnections(),
          state: syncStateRef.current,
        }))
      }
    },
    onReceiveData: (id: string, data: unknown) => {
      if (data && typeof data === "object" && "type" in data) {
        if (data.type === "sync") {
          const action = data as SyncAction;
          const currentConnections = peerConnection.getConnections();
          const peerId = peerConnection.getPeer()?.id;
          action.connections?.map((id) => {
            if (id !==peerId && currentConnections.indexOf(id) === -1) {
              peerConnection.connectPeer(id, peerCallbacks)
            }
          })
          onHandleActionRef.current(action);
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
  }), [syncParamsRef, syncStateRef])

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
