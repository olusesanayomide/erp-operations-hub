import { WifiOff } from "lucide-react";
import { OFFLINE_MESSAGE, useOnlineStatus } from "@/shared/lib/online-status";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 border-b border-amber-300/70 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm">
      <div className="mx-auto flex max-w-7xl items-start gap-3 text-sm">
        <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-semibold">You are offline</p>
          <p className="text-amber-900">
            {OFFLINE_MESSAGE} Read-only cached data may remain visible, but
            changes are disabled until your connection returns.
          </p>
        </div>
      </div>
    </div>
  );
}
