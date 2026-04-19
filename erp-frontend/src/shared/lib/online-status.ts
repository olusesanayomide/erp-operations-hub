import { useEffect, useState } from "react";

export const OFFLINE_MESSAGE =
  "You appear to be offline. Check your internet connection and try again.";

export function isBrowserOnline() {
  if (typeof navigator === "undefined") {
    return true;
  }

  return navigator.onLine;
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(isBrowserOnline);

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(isBrowserOnline());
    };

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    updateOnlineStatus();

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  return isOnline;
}
