import type { AlertHistoryEntry } from "./types";

interface AlertModerationHistoryProps {
  entries: AlertHistoryEntry[];
  loading: boolean;
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

/** Historique de modération de l'alerte (US-40) : admin, date, état précédent/nouvel état, motif. */
export default function AlertModerationHistory({ entries, loading }: AlertModerationHistoryProps) {
  return (
    <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Historique de modération
      </h2>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Chargement de l&apos;historique...</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Aucune décision de modération enregistrée pour cette alerte.</p>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li key={entry.id} className="border-l-2 border-blue-300 dark:border-blue-700 pl-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {entry.admin_username || "Admin inconnu"}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(entry.created_at)}</span>
              </div>
              {entry.summary && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{entry.summary}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
