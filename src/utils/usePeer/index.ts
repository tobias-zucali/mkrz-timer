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

  const [remoteLost, setRemoteLost] = useState(false);

  const isRemoteIdRef = useRef(false);
  isRemoteIdRef.current = (remoteIdParam === peerId);

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
      if (isRemoteIdRef.current) {
        peerConnection.send(id, getSyncAction({
          params: syncParamsRef.current,
          connections: peerConnection.getConnections(),
          state: syncStateRef.current,
        }))
      }
    },
    onReceiveData: (senderId: string, data: unknown) => {
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
      console.log("usePeer onClose", id)
      setConnections(peerConnection.getConnections())
    },
    onConnectionClose: (id: string) => {
      console.log("usePeer onConnectionClose", id)
      if (remoteIdParam === id) {
        console.log("usePeer remote lost", id)
        setRemoteLost(true);
      }
      setConnections(peerConnection.getConnections())
    },
  }), [remoteIdParam, syncParamsRef, syncStateRef])

  const connectRemote = useCallback(async (
    remoteId: string,
  ) => {
    const startSession = async (id?: string | null) => {
      try {
        const peerId = await peerConnection.startPeerSession({
          id: id || "",
          ...peerCallbacks,
        })
        return peerId;
      } catch (error) {
        if (error instanceof PeerError) {
          if (error.type === PeerErrorType.UnavailableID) {
            return;
          }
        }
        throw error;
      }
    };

    let peerId: string | undefined;

    try {
      peerId = await startSession(remoteId);

      if (!peerId) {
        // fall back to fresh id
        peerId = await startSession();
      }

      if (peerId && peerId !== remoteId) {
        await peerConnection.connectPeer(remoteId, peerCallbacks);
      }  
    } catch (error) {
      console.error(error)
      setError(error as Error)
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

  useEffect(() => {
    if (remoteLost) {
      console.log("Reconnecting to remote peer...", remoteIdParam)
      if (remoteIdParam) {
        connectRemote(remoteIdParam)
      }
      setRemoteLost(false);
    }
  }, [remoteLost, remoteIdParam, connectRemote]);

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
