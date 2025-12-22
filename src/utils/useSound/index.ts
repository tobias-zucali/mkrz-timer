import { useMemo } from "react";

export default function useSound() {
  const sound = useMemo(() => {
    if (typeof window !== "undefined") {
      // Ensure this runs only on the client side
      return new Audio("/sounds/Attention.mp3");
    }
    return null; // Return null during SSR
  }, []);

  return sound;
}
