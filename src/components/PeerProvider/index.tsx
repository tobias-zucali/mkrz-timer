import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import Peer from 'peerjs';

interface PeerContextType {
  peer: Peer | null;
  peerId: string | null;
}

const PeerContext = createContext<PeerContextType | undefined>(undefined);

export const PeerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);

  useEffect(() => {
    const newPeer = new Peer(); // Create a new PeerJS instance
    setPeer(newPeer);

    newPeer.on('open', (id) => {
      setPeerId(id); // Set the peer ID when the connection is established
      console.log('Peer connected with ID:', id);
    });

    return () => {
      newPeer.destroy(); // Clean up the PeerJS instance on unmount
    };
  }, []);

  const value = useMemo(() => ({ peer, peerId }), [peer, peerId]);

  return <PeerContext.Provider value={value}>{children}</PeerContext.Provider>;
};

export const usePeer = (): PeerContextType => {
  const context = useContext(PeerContext);
  if (!context) {
    throw new Error('usePeer must be used within a PeerProvider');
  }
  return context;
};
