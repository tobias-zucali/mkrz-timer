import { usePeer } from 'components/PeerProvider';
import { useEffect } from 'react';
// ...existing imports...

function Timer() {
  const { peer, peerId } = usePeer();

  useEffect(() => {
    if (peer) {
      peer.on('connection', (conn) => {
        console.log('Connected to:', conn.peer);

        conn.on('data', (data) => {
          console.log('Received data:', data);
        });

        conn.on('open', () => {
          conn.send('Hello from Timer!');
        });
      });
    }
  }, [peer]);

  return (
    <div>
      <p>Peer ID: {peerId || 'Connecting...'}</p>
      {/* ...existing code... */}
    </div>
  );
}

export default Timer;
