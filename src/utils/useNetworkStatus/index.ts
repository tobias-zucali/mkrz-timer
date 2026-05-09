import { useEffect, useState } from "react"

export default function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null)

  useEffect(() => {
    const updateStatus = () => {
      setIsOnline(navigator.onLine)
    }

    updateStatus()
    window.addEventListener("online", updateStatus)
    window.addEventListener("offline", updateStatus)

    return () => {
      window.removeEventListener("online", updateStatus)
      window.removeEventListener("offline", updateStatus)
    }
  }, [])

  return isOnline
}
