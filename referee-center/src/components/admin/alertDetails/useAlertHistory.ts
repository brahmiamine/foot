import { useEffect, useState } from "react";
import type { AlertHistoryEntry } from "./types";

/** Historique de modération d'une alerte (US-40) — voir /api/admin/alerts/[id]/history. */
export function useAlertHistory(alertId: string) {
  const [entries, setEntries] = useState<AlertHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/alerts/${alertId}/history`);
        if (!response.ok) throw new Error("Erreur lors du chargement de l'historique");
        const data: AlertHistoryEntry[] = await response.json();
        if (!cancelled) setEntries(data);
      } catch (err) {
        console.error("Error fetching alert history:", err);
        if (!cancelled) setEntries([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [alertId]);

  return { entries, loading };
}
