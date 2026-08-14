"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface AnomalyDetails {
  extremeVotesPercentage?: number;
  timeGroupingDetected?: boolean;
  variance?: number;
  earlyVotesPercentage?: number;
}

interface Anomaly {
  isSuspicious: boolean;
  confidence: number;
  reasons: string[];
  details: AnomalyDetails;
}

interface MatchAnomaly {
  match_id: string;
  match_date: string | null;
  total_votes: number;
  anomaly: Anomaly;
  credibility: number;
}

interface AnomaliesResponse {
  total: number;
  anomalies: MatchAnomaly[];
}

export default function AdminAnomaliesManager() {
  const [anomalies, setAnomalies] = useState<MatchAnomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlySuspicious, setOnlySuspicious] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnomalies = async () => {
    try {
      setRefreshing(true);
      const response = await fetch(
        `/api/admin/arbitrage/arbinote/votes/anomalies?onlySuspicious=${onlySuspicious}&limit=100`
      );

      if (!response.ok) {
        throw new Error("Erreur lors du chargement des anomalies");
      }

      const data: AnomaliesResponse = await response.json();
      setAnomalies(data.anomalies);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      console.error("Error fetching anomalies:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
  }, [onlySuspicious]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return "text-red-600 bg-red-50";
    if (confidence >= 0.5) return "text-orange-600 bg-orange-50";
    if (confidence >= 0.3) return "text-yellow-600 bg-yellow-50";
    return "text-green-600 bg-green-50";
  };

  const getCredibilityColor = (credibility: number) => {
    if (credibility < 30) return "text-red-600 font-bold";
    if (credibility < 50) return "text-orange-600 font-semibold";
    if (credibility < 70) return "text-yellow-600";
    return "text-green-600";
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Chargement des anomalies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            Détection d&apos;Anomalies
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Analyse statistique des votes pour détecter les manipulations
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={onlySuspicious}
              onChange={(e) => setOnlySuspicious(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Seulement suspects
            </span>
          </label>
          <button
            onClick={fetchAnomalies}
            disabled={refreshing}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {refreshing ? "Actualisation..." : "Actualiser"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      {anomalies.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">
            {onlySuspicious
              ? "Aucune anomalie suspecte détectée"
              : "Aucune anomalie trouvée"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Match ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date Match
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Votes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Suspicion
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Crédibilité
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Raisons
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {anomalies.map((item) => (
                    <tr
                      key={item.match_id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-gray-100">
                        {item.match_id.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(item.match_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {item.total_votes}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConfidenceColor(
                            item.anomaly.confidence
                          )}`}
                        >
                          {(item.anomaly.confidence * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`text-sm font-medium ${getCredibilityColor(
                            item.credibility
                          )}`}
                        >
                          {item.credibility.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="max-w-md">
                          {item.anomaly.reasons.length > 0 ? (
                            <ul className="list-disc list-inside space-y-1">
                              {item.anomaly.reasons.slice(0, 2).map((reason, idx) => (
                                <li key={idx} className="text-xs">
                                  {reason}
                                </li>
                              ))}
                              {item.anomaly.reasons.length > 2 && (
                                <li className="text-xs text-gray-400">
                                  +{item.anomaly.reasons.length - 2} autres
                                </li>
                              )}
                            </ul>
                          ) : (
                            <span className="text-gray-400">Aucune</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/admin/matches?matchId=${item.match_id}`}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Voir match
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
            {anomalies.length} anomalie{anomalies.length > 1 ? "s" : ""} trouvée
            {anomalies.length > 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}

