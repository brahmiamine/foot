"use client";

import { useEffect, useState } from "react";

const POLL_INTERVAL_MS = 60_000;

export default function AdminAlertsBadge() {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let disposed = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const clearScheduledPoll = () => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
    };

    const scheduleNext = () => {
      clearScheduledPoll();
      if (!disposed && document.visibilityState === "visible") {
        timeout = setTimeout(fetchCount, POLL_INTERVAL_MS);
      }
    };

    const fetchCount = async () => {
      if (disposed || document.visibilityState !== "visible") return;

      try {
        const response = await fetch("/api/admin/arbitrage/arbinote/alerts/stats", {
          cache: "no-store",
        });
        if (response.ok && !disposed) {
          const data = await response.json();
          setCount(data.unresolved || 0);
        }
      } catch (error) {
        if (!disposed) {
          console.error("Error fetching alerts count:", error);
        }
      } finally {
        if (!disposed) {
          setLoading(false);
          scheduleNext();
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchCount();
      } else {
        clearScheduledPoll();
      }
    };

    void fetchCount();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      disposed = true;
      clearScheduledPoll();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  if (loading || count === null || count === 0) {
    return null;
  }

  return (
    <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
      {count}
    </span>
  );
}
