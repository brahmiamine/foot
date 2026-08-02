import { useState, useEffect } from "react";
import type { AlertsResponse, VoteAlert } from "./types";

export function useAdminAlerts() {
  const [alerts, setAlerts] = useState<VoteAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);

  const fetchAlerts = async () => {
    try {
      setRefreshing(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (typeFilter !== "all") {
        params.append("alertType", typeFilter);
      }
      params.append("limit", "100");

      const response = await fetch(`/api/admin/alerts?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Erreur lors du chargement des alertes");
      }

      const data: AlertsResponse = await response.json();
      setAlerts(data.alerts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      console.error("Error fetching alerts:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [statusFilter, typeFilter]);

  const handleResolve = async (alertId: string, notes?: string) => {
    try {
      setResolving(alertId);
      const response = await fetch(`/api/admin/alerts/${alertId}/resolve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la résolution de l'alerte");
      }

      await fetchAlerts();
    } catch (err) {
      console.error("Error resolving alert:", err);
      alert("Erreur lors de la résolution de l'alerte");
    } finally {
      setResolving(null);
    }
  };

  const handleDismiss = async (alertId: string, notes?: string) => {
    try {
      setResolving(alertId);
      const response = await fetch(`/api/admin/alerts/${alertId}/dismiss`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de l'ignorance de l'alerte");
      }

      await fetchAlerts();
    } catch (err) {
      console.error("Error dismissing alert:", err);
      alert("Erreur lors de l'ignorance de l'alerte");
    } finally {
      setResolving(null);
    }
  };

  return {
    alerts,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    refreshing,
    resolving,
    fetchAlerts,
    handleResolve,
    handleDismiss,
  };
}
