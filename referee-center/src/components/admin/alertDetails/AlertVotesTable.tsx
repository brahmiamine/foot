import type { Vote } from "./types";
import { formatDate, getModerationStatusColor } from "./utils";

interface AlertVotesTableProps {
  votes: Vote[];
  totalVotes: number;
  moderationStats: {
    pending: number;
    validated: number;
    excluded: number;
  };
  moderating: string | null;
  onModerate: (voteId: string, action: "validate" | "exclude", notes?: string) => void;
}

export default function AlertVotesTable({
  votes,
  totalVotes,
  moderationStats,
  moderating,
  onModerate,
}: AlertVotesTableProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Votes ({totalVotes})
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Pending: {moderationStats.pending} | Validated: {moderationStats.validated} | Excluded: {moderationStats.excluded}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Note
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                IP
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Fingerprint
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Statut
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {votes.map((vote) => {
              const isExtreme = vote.note_globale >= 4.8 || vote.note_globale <= 1.2;
              return (
                <tr
                  key={vote.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    isExtreme ? "bg-red-50/50 dark:bg-red-900/10" : ""
                  }`}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`font-semibold ${
                        isExtreme
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {vote.note_globale.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(vote.created_at)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono">
                    {vote.ip_address || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono">
                    {vote.device_fingerprint
                      ? `${vote.device_fingerprint.slice(0, 8)}...`
                      : "N/A"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getModerationStatusColor(
                        vote.moderation_status
                      )}`}
                    >
                      {vote.moderation_status === "validated" && "✓ Validé"}
                      {vote.moderation_status === "excluded" && "✗ Exclu"}
                      {(!vote.moderation_status || vote.moderation_status === "pending") && "⏳ En attente"}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {(!vote.moderation_status || vote.moderation_status === "pending") && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onModerate(vote.id, "validate")}
                          disabled={moderating === vote.id}
                          className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50"
                          title="Valider ce vote"
                        >
                          ✓ Valider
                        </button>
                        <button
                          onClick={() => onModerate(vote.id, "exclude")}
                          disabled={moderating === vote.id}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                          title="Exclure ce vote"
                        >
                          ✗ Exclure
                        </button>
                      </div>
                    )}
                    {vote.moderation_status === "validated" && (
                      <span className="text-green-600 dark:text-green-400 text-xs">
                        Validé le {vote.moderated_at ? formatDate(vote.moderated_at) : "N/A"}
                      </span>
                    )}
                    {vote.moderation_status === "excluded" && (
                      <span className="text-red-600 dark:text-red-400 text-xs">
                        Exclu le {vote.moderated_at ? formatDate(vote.moderated_at) : "N/A"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
