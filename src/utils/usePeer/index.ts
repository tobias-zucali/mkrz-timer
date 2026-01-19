import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PeerError, PeerErrorType } from "peerjs";

import PeerConnection from "./PeerConnection";
import { TimerState } from "@/utils/useTimer";
import debug from "@/utils/debug";


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

  const isRemote = (peerId && remoteIdParam === peerId);

  const currentMemoRefs = {
    connections,
    onHandleAction,
    remoteIdParam,
    isRemote,
  }
  const memoRefs = useRef(currentMemoRefs);
  memoRefs.current = currentMemoRefs;


  const peer = useMemo(() => {
    const newPeer = new PeerConnection({
      onError: debug.wrap("usePeer onError", setError),
      onOpen: debug.wrap("usePeer onOpen", () => { }),
      onConnection: debug.wrap("usePeer onConnection", (id: string) => {
        if (memoRefs.current.isRemote) {
          newPeer.sendAll(
            getSyncAction({
              params: syncParamsRef.current,
              connections: newPeer.getConnections(),
              state: syncStateRef.current,
            })
          );
        }
      }),
      onReceiveData: debug.wrap("usePeer onReceiveData", (senderId: string, data: unknown) => {
        if (data && typeof data === "object" && "type" in data) {
          switch (data.type) {
            case "sync": {
              const action = data as SyncAction;
              const peerId = newPeer.getPeerId();

              const connectionsToCheck = [
                ...(action.connections || []),
                senderId
              ].filter((id, index, self) => self.indexOf(id) === index); // unique

              connectionsToCheck.map((id) => {
                if (
                  id !== peerId &&
                  memoRefs.current.connections.indexOf(id) === -1
                ) {
                  if (newPeer.getConnections().indexOf(id) !== -1) {
                    debug.log("usePeer onReceiveData connect missing peer", id);
                    newPeer.connectPeer(id);
                  } else {
                    debug.log("usePeer onReceiveData sync missing peer", id);
                    setConnections((curr) => [...curr, id]);
                  }
                }
              });
              memoRefs.current.onHandleAction(action);
              if (memoRefs.current.isRemote) {
                newPeer.getConnections().forEach((connId) => {
                  if (connId !== senderId) {
                    newPeer.send(connId, data);
                  }
                });
              }
              return;
            }
          }
        }
      }),
      onClose: debug.wrap("usePeer onClose", (id?: string) => {
        debug.warn("Peer closed", id);
        setPeerId(undefined);
      }),
      onConnectionClose: debug.wrap("usePeer onConnectionClose", (id: string) => {
        if (memoRefs.current.remoteIdParam === id) {
          debug.log("remote lost", id);
          setRemoteLost(true);
        }
      }),
      onConnectionsChange: debug.wrap("usePeer onConnectionsChange", (connections: string[]) => {
        setConnections(connections);
      }),
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
      debug.log("usePeer syncAll", { keys, state });
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
                debug.warn(`usePeer syncAll: key ${key} not found`, {
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
        debug.error(error);
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
      debug.log("Reconnecting to remote peer...", remoteIdParam);
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
      peer: peer,
      disconnect: () => peer.closePeerSession(),
      error,
      peerId,
      syncAll,
    }),
    [connectRemote, connections, error, peer, peerId, syncAll]
  );
}
