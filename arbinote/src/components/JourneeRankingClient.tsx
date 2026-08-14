"use client";
import { useState } from "react";
import Link from "next/link";
import { getLocalizedName, getJourneeDisplayName } from "@/lib/utils";
import { useTranslations } from "@/lib/i18n";
import type { BayesianRankingEntry } from "@/lib/bayesianRanking";

export interface JourneeSummary {
  id: string;
  numero: number;
  saison_id: string;
  date_journee?: string | null;
}

interface JourneeRankingClientProps {
  journee: JourneeSummary;
  ranking: BayesianRankingEntry[];
  locale: string;
}

export default function JourneeRankingClient({ journee, ranking, locale }: JourneeRankingClientProps) {
  const { t } = useTranslations();
  const [showAll, setShowAll] = useState(false);
  const displayRanking = showAll ? ranking : ranking.slice(0, 3);

  return (
    <div className="rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-3 sm:p-4 md:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">{t("common.matchday")}</p>
          <Link 
            href={`/?journeeId=${journee.id}`}
            className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
          >
            {getJourneeDisplayName(journee, locale)}
          </Link>
        </div>
      </div>
      {displayRanking.length === 0 ? (
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{t("home.rankings.empty")}</p>
      ) : (
        <>
          <ul className="space-y-2 sm:space-y-3">
            {displayRanking.map((entry, index) => {
              const rank = index + 1;
              const isTopThree = rank <= 3;
              
              // Couleurs pour les top 3
              let rankColorClass = "";
              let rankIcon = null;
              
              if (isTopThree) {
                if (rank === 1) {
                  rankColorClass = "text-yellow-500 dark:text-yellow-400"; // Gold
                  rankIcon = <i className="fa-solid fa-1"></i>;
                } else if (rank === 2) {
                  rankColorClass = "text-gray-400 dark:text-gray-500"; // Silver
                  rankIcon = <i className="fa-solid fa-2"></i>;
                } else if (rank === 3) {
                  rankColorClass = "text-amber-600 dark:text-amber-700"; // Bronze
                  rankIcon = <i className="fa-solid fa-3"></i>;
                }
              }
              
              return (
                <li
                  key={entry.arbitreId}
                  className="flex items-center justify-between rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-700 px-3 sm:px-4 py-2 sm:py-3"
                >
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    {isTopThree ? (
                      <span className={`text-lg sm:text-xl font-bold ${rankColorClass} shrink-0`}>
                        {rankIcon}
                      </span>
                    ) : (
                      <span className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 shrink-0">
                        {rank}.
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate">
                        <Link
                          href={`/arbitres/${entry.arbitreId}`}
                          className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {getLocalizedName(locale, {
                            defaultValue: entry.nom,
                            fr: entry.nom,
                            en: entry.nom_en ?? undefined,
                            ar: entry.nom_ar ?? undefined,
                          })}
                        </Link>
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{t("home.rankings.votes", { count: entry.votes })}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                      {entry.moyenne_bayesienne !== undefined ? entry.moyenne_bayesienne.toFixed(2) : entry.moyenne.toFixed(2)}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{t("common.globalNote")}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          {ranking.length > 3 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
            >
              {showAll ? (t("classement.showLess") || "Voir moins") : (t("classement.showAll") || "Voir tout le classement")}
            </button>
          )}
        </>
      )}
    </div>
  );
}

