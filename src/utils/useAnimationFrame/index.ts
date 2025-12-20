import { useEffect, useRef } from 'react';


type Settings = {
  isPaused?: boolean;
}

export default function useAnimationFrame(
  callback: (deltaTime: number) => void,
  settings: Settings = {},
) {
  const requestRef = useRef<number | undefined>(undefined);
  const previousTimeRef = useRef<number | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const { isPaused = false } = settings;

  const animate:FrameRequestCallback = (time) => {
    if (previousTimeRef.current !== null) {
      const deltaTime = time - previousTimeRef.current;
      callbackRef.current(deltaTime);
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (!isPaused) {
      requestRef.current = window.requestAnimationFrame(animate);
    }
    return function destroy() {
      if (requestRef.current) {
        previousTimeRef.current = null;
        cancelAnimationFrame(requestRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused]);
}
