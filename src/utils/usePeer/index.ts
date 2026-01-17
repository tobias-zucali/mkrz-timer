import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PeerError, PeerErrorType } from "peerjs";

import PeerConnection from "./PeerConnection";
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
  state,
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

export type SyncAction = ReturnType<typeof getSyncAction>;

export default function usePeer({
  remoteIdParam,
  syncParamsRef,
  syncStateRef,
  onHandleAction,
}: {
  remoteIdParam: string | null;
  syncParamsRef: React.RefObject<SyncParams>;
  syncStateRef: React.RefObject<TimerState>;
  onHandleAction: (action: SyncAction) => void;
}) {
  const [error, setError] = useState<Error | null>(null);
  const [connections, setConnections] = useState<string[]>([]);
  const [remoteLost, setRemoteLost] = useState(false);
  const [peerId, setPeerId] = useState<string | undefined>();

  const memoRefs = useRef({
    onHandleAction,
    remoteIdParam,
  });
  memoRefs.current = {
    onHandleAction,
    remoteIdParam,
  };


  const peer = useMemo(() => {
    const newPeer = new PeerConnection({
      onError: setError,
      onOpen: () => { },
      onConnection: (id: string) => {
        const isRemote = (memoRefs.current?.remoteIdParam === newPeer.getPeerId());
        console.log("usePeer onConnection", id, "isRemote:", isRemote);
        if (isRemote) {
          newPeer.send(
            id,
            getSyncAction({
              params: syncParamsRef.current,
              connections: newPeer.getConnections(),
              state: syncStateRef.current,
            })
          );
        }
      },
      onReceiveData: (senderId: string, data: unknown) => {
        console.log("usePeer onReceiveData", senderId, data);
        if (data && typeof data === "object" && "type" in data) {
          switch (data.type) {
            case "sync": {
              const action = data as SyncAction;
              const currentConnections = newPeer.getConnections();
              const peerId = newPeer.getPeerId();
              action.connections?.map((id) => {
                if (
                  id !== peerId &&
                  currentConnections.indexOf(id) === -1
                ) {
                  newPeer.connectPeer(id);
                }
              });
              memoRefs.current.onHandleAction(action);
              return;
            }
          }
        }
        console.warn("handleAction: Unknown action received:", data);
      },
      onClose: (id?: string) => {
        setPeerId(undefined);
        console.log("usePeer onClose", id);
      },
      onConnectionClose: (id: string) => {
        console.log("usePeer onConnectionClose", id);
        if (memoRefs.current.remoteIdParam === id) {
          console.log("usePeer remote lost", id);
          setRemoteLost(true);
        }
      },
      onConnectionsChange(connections: string[]) {
        console.log("onConnectionsChange", connections);
        setConnections(connections);
      },
    });
    return newPeer;
  }, [syncParamsRef, syncStateRef]);

  const syncAll = useCallback(
    ({
      keys,
      state = {},
    }: {
      keys?: string[];
      state?: Partial<TimerState>;
    }) => {
      peer.sendAll(
        getSyncAction({
          params: {
            ...(keys
              ? keys.reduce((prev, key) => {
                  if (Object.hasOwn(syncParamsRef.current, key)) {
                    return {
                      ...prev,
                      [key]: syncParamsRef.current[key as keyof SyncParams],
                    };
                  }
                  console.warn(`usePeer syncAll: key ${key} not found`, {
                    keys,
                    syncParams: syncParamsRef.current,
                  });
                  return prev;
                }, {})
              : syncParamsRef.current),
          },
          connections: peer.getConnections(),
          state: {
            ...state,
            ...syncStateRef.current,
          },
        })
      );
    },
    [syncParamsRef, syncStateRef, peer]
  );

  const connectRemote = useCallback(
    async (remoteId: string) => {
      const startSession = async (id?: string) => {
        try {
          const peerId = await peer?.startSession(id);
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

        if (peerId && remoteId && peerId !== remoteId) {
          await peer.connectPeer(remoteId);
        }
        setPeerId(peerId);
        return peerId;
      } catch (error) {
        console.error(error);
        setError(error as Error);
      }
    },
    [peer]
  );

  useEffect(() => {
    if (remoteIdParam) {
      connectRemote(remoteIdParam);
    }
    return () => {
      peer.closePeerSession();
    };
    // initial render only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (remoteLost) {
      console.log("Reconnecting to remote peer...", remoteIdParam);
      if (remoteIdParam) {
        connectRemote(remoteIdParam);
      }
      setRemoteLost(false);
    }
  }, [remoteLost, remoteIdParam, connectRemote]);

  return useMemo(
    () => ({
      connectRemote,
      connections,
      disconnect: () => peer.closePeerSession(),
      error,
      peerId,
      syncAll,
    }),
    [connectRemote, connections, error, peer, peerId, syncAll]
  );
}
