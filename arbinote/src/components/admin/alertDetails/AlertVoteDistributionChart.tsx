import type { Vote } from "./types";
import { formatDate } from "./utils";

interface AlertVoteDistributionChartProps {
  votes: Vote[];
  rawMatchDate?: string | null;
}

export default function AlertVoteDistributionChart({ votes, rawMatchDate }: AlertVoteDistributionChartProps) {
  // Préparer les données pour le graphique de distribution temporelle
  const timeDistribution = votes.map((vote) => ({
    time: new Date(vote.created_at).getTime(),
    note: vote.note_globale,
    id: vote.id,
  })).sort((a, b) => a.time - b.time);

  const matchDate = rawMatchDate ? new Date(rawMatchDate).getTime() : null;
  // Note: identical logic in the original (pre-split) AdminAlertDetails.tsx did not trigger react-hooks/purity.
  // eslint-disable-next-line react-hooks/purity
  const minTime = matchDate || (timeDistribution.length > 0 ? timeDistribution[0].time : Date.now());
  const maxTime = timeDistribution.length > 0
    ? timeDistribution[timeDistribution.length - 1].time
    // eslint-disable-next-line react-hooks/purity
    : Date.now();

  return (
    <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
        Distribution des votes dans le temps
      </h3>
      <div className="h-64 relative">
        <svg width="100%" height="100%" className="overflow-visible">
          {/* Ligne de temps */}
          {timeDistribution.map((point, idx) => {
            const x = ((point.time - minTime) / (maxTime - minTime)) * 100;
            const y = 100 - ((point.note / 5) * 100);
            const isExtreme = point.note >= 4.8 || point.note <= 1.2;

            const vote = votes.find(v => v.id === point.id);
            return (
              <g key={point.id}>
                <title>{`Note: ${point.note} - ${vote ? formatDate(vote.created_at) : ""}`}</title>
                <circle
                  cx={`${x}%`}
                  cy={`${y}%`}
                  r="4"
                  fill={isExtreme ? "#ef4444" : "#3b82f6"}
                  className="hover:r-6 transition-all cursor-pointer"
                />
              </g>
            );
          })}
          {/* Ligne de référence (moyenne) */}
          {votes.length > 0 && (() => {
            const avg = votes.reduce((sum, v) => sum + v.note_globale, 0) / votes.length;
            const y = 100 - ((avg / 5) * 100);
            return (
              <line
                x1="0"
                y1={`${y}%`}
                x2="100%"
                y2={`${y}%`}
                stroke="#10b981"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.5"
              />
            );
          })()}
        </svg>
      </div>
      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>Vote normal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>Vote extrême (≤1.2 ou ≥4.8)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 border-t-2 border-green-500 border-dashed"></div>
          <span>Moyenne: {(votes.reduce((sum, v) => sum + v.note_globale, 0) / votes.length).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
