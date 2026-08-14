"use client";

import { useState, useEffect } from "react";

export default function AdminAlertsBadge() {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await fetch("/api/admin/arbitrage/arbinote/alerts/stats");
        if (response.ok) {
          const data = await response.json();
          setCount(data.unresolved || 0);
        }
      } catch (error) {
        console.error("Error fetching alerts count:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCount();
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
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

