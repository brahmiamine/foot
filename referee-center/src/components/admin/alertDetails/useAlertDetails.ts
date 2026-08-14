import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AlertDetails } from "./types";

export function useAlertDetails(alertId: string) {
  const router = useRouter();
  const [alert, setAlert] = useState<AlertDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moderating, setModerating] = useState<string | null>(null);

  useEffect(() => {
    const fetchAlert = async () => {
      try {
        setLoading(true);
        // Récupérer l'alerte
        const alertResponse = await fetch(`/api/admin/alerts/${alertId}`);
        if (!alertResponse.ok) {
          throw new Error("Alerte non trouvée");
        }
        const alertData = await alertResponse.json();

        // Récupérer les détails du match avec les votes
        const detailsResponse = await fetch(
          `/api/admin/votes/${alertData.match_id}/details`
        );
        if (!detailsResponse.ok) {
          throw new Error("Erreur lors du chargement des détails");
        }
        const detailsData = await detailsResponse.json();

        setAlert(detailsData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
        console.error("Error fetching alert details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAlert();
  }, [alertId]);

  const handleModerate = async (voteId: string, action: "validate" | "exclude", notes?: string) => {
    try {
      setModerating(voteId);
      const response = await fetch(`/api/admin/votes/moderate/${voteId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, notes }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la modération");
      }

      // Recharger les détails
      const detailsResponse = await fetch(
        `/api/admin/votes/${alert?.match.id}/details`
      );
      if (detailsResponse.ok) {
        const detailsData = await detailsResponse.json();
        setAlert(detailsData);
      }
    } catch (err) {
      console.error("Error moderating vote:", err);
      window.alert("Erreur lors de la modération du vote");
    } finally {
      setModerating(null);
    }
  };

  return { alert, loading, error, moderating, handleModerate };
}
