import type { AlertDetails } from "./types";

interface AlertStatsGridProps {
  alert: AlertDetails;
}

export default function AlertStatsGrid({ alert }: AlertStatsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Total votes</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{alert.totalVotes}</p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Crédibilité</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{alert.credibility.toFixed(0)}%</p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Confiance anomalie</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {(alert.anomaly.confidence * 100).toFixed(0)}%
        </p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Votes validés</p>
        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
          {alert.moderationStats.validated}
        </p>
      </div>
    </div>
  );
}
