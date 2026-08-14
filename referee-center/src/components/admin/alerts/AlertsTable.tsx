"use client";

import Link from "next/link";
import type { VoteAlert } from "./types";

interface AlertsTableProps {
  alerts: VoteAlert[];
  resolving: string | null;
  onResolve: (alertId: string, notes?: string) => void;
  onDismiss: (alertId: string, notes?: string) => void;
}

function getAlertTypeColor(type: string) {
  if (type === "critical") {
    return "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700";
  }
  return "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700";
}

function getStatusColor(status: string) {
  switch (status) {
    case "new":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "reviewed":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    case "resolved":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "dismissed":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString("fr-FR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AlertsTable({
  alerts,
  resolving,
  onResolve,
  onDismiss,
}: AlertsTableProps) {
  if (alerts.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400">
          Aucune alerte trouvée
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Match
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Confiance
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Crédibilité
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {alerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getAlertTypeColor(
                        alert.alert_type
                      )}`}
                    >
                      {alert.alert_type === "critical" ? "🔴 Critique" : "⚠️ Important"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/matches?matchId=${alert.match_id}`}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                    >
                      {alert.match_id.slice(0, 8)}...
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(alert.created_at)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm font-medium">
                      {(alert.confidence * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm font-medium">
                      {alert.credibility.toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        alert.status
                      )}`}
                    >
                      {alert.status === "new" && "Nouvelle"}
                      {alert.status === "reviewed" && "En cours"}
                      {alert.status === "resolved" && "Résolue"}
                      {alert.status === "dismissed" && "Ignorée"}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      {alert.status !== "resolved" && alert.status !== "dismissed" && (
                        <>
                          <button
                            onClick={() => onResolve(alert.id)}
                            disabled={resolving === alert.id}
                            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50"
                            title="Marquer comme résolu"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => onDismiss(alert.id)}
                            disabled={resolving === alert.id}
                            className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 disabled:opacity-50"
                            title="Ignorer"
                          >
                            ✗
                          </button>
                        </>
                      )}
                      <Link
                        href={`/admin/alerts/${alert.id}`}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Voir les détails et modérer"
                      >
                        Modérer
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
        {alerts.length} alerte{alerts.length > 1 ? "s" : ""} trouvée{alerts.length > 1 ? "s" : ""}
      </div>
    </div>
  );
}
