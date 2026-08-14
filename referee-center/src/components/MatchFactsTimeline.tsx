import type { MatchFact, MatchFactType } from "@/lib/dataAccess/matchFacts";

const EVENT_ICONS: Record<MatchFactType, string> = {
  GOAL: "⚽",
  CARD: "🟨",
  SUBSTITUTION: "🔄",
  INJURY: "🩹",
};

const PERIOD_LABELS: Record<string, string> = {
  ET1: " (prol.)",
  ET2: " (prol.)",
};

/**
 * Fil chronologique des faits de match (buts, cartons, blessures,
 * remplacements) saisis dans la feuille de match électronique. Lecture
 * seule — voir lib/dataAccess/matchFacts.ts.
 */
export default function MatchFactsTimeline({
  facts,
  homeTeamId,
  emptyLabel = "Aucun fait de match enregistré pour l'instant.",
}: {
  facts: MatchFact[];
  homeTeamId?: string | null;
  emptyLabel?: string;
}) {
  if (facts.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">{emptyLabel}</p>;
  }

  return (
    <ol className="relative border-s border-gray-200 dark:border-gray-700 ms-2">
      {facts.map((fact) => {
        const isHome = homeTeamId != null && fact.teamId === homeTeamId;
        const isAway = homeTeamId != null && fact.teamId != null && fact.teamId !== homeTeamId;
        return (
          <li key={fact.id} className="mb-3 ms-4">
            <span
              className={`absolute -start-1.5 flex h-3 w-3 items-center justify-center rounded-full ring-4 ring-white dark:ring-gray-900 ${
                isHome ? "bg-blue-500" : isAway ? "bg-orange-500" : "bg-gray-400"
              }`}
            />
            <div className="flex items-start gap-2">
              <span className="shrink-0 font-mono text-xs sm:text-sm text-gray-500 dark:text-gray-400 tabular-nums">
                {fact.minute != null ? `${fact.minute}'` : "—"}
                {fact.period ? PERIOD_LABELS[fact.period] ?? "" : ""}
              </span>
              <span className="shrink-0">{EVENT_ICONS[fact.type]}</span>
              <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
                {fact.label}
                {fact.detail && <span className="text-gray-500 dark:text-gray-400"> ({fact.detail})</span>}
                {fact.neutralized && (
                  <span className="ml-1 inline-block rounded bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-600 dark:text-gray-300">
                    neutralisé
                  </span>
                )}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
