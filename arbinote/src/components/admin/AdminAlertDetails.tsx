"use client";

import Link from "next/link";
import AlertAnomalyReasons from "./alertDetails/AlertAnomalyReasons";
import AlertModerationHistory from "./alertDetails/AlertModerationHistory";
import AlertStatsGrid from "./alertDetails/AlertStatsGrid";
import AlertVoteDistributionChart from "./alertDetails/AlertVoteDistributionChart";
import AlertVotesTable from "./alertDetails/AlertVotesTable";
import { useAlertDetails } from "./alertDetails/useAlertDetails";
import { useAlertHistory } from "./alertDetails/useAlertHistory";

interface AdminAlertDetailsProps {
  alertId: string;
}

export default function AdminAlertDetails({ alertId }: AdminAlertDetailsProps) {
  const { alert, loading, error, moderating, handleModerate } = useAlertDetails(alertId);
  const { entries: historyEntries, loading: historyLoading } = useAlertHistory(alertId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Chargement des détails...</p>
        </div>
      </div>
    );
  }

  if (error || !alert) {
    return (
      <div className="p-6">
        <div className="mb-4">
          <Link
            href="/admin/alerts"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            ← Retour aux alertes
          </Link>
        </div>
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error || "Alerte non trouvée"}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          href="/admin/alerts"
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 mb-4 inline-block"
        >
          ← Retour aux alertes
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Détails de l&apos;Alerte
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Match: {alert.match.equipe_home?.nom || "N/A"} vs {alert.match.equipe_away?.nom || "N/A"}
        </p>
      </div>

      {/* Statistiques générales */}
      <AlertStatsGrid alert={alert} />

      {/* Raisons de l'anomalie */}
      {alert.anomaly.reasons.length > 0 && (
        <AlertAnomalyReasons reasons={alert.anomaly.reasons} />
      )}

      {/* Graphique de distribution temporelle */}
      <AlertVoteDistributionChart votes={alert.votes} rawMatchDate={alert.match.date} />

      {/* Liste des votes */}
      <AlertVotesTable
        votes={alert.votes}
        totalVotes={alert.totalVotes}
        moderationStats={alert.moderationStats}
        moderating={moderating}
        onModerate={handleModerate}
      />

      {/* Historique de modération de l'alerte (US-40) */}
      <AlertModerationHistory entries={historyEntries} loading={historyLoading} />
    </div>
  );
}
