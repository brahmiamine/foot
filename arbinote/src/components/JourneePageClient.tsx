"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import MatchCardClient from "./MatchCardClient";
import MatchCardSkeleton from "./MatchCardSkeleton";
import RankingTable from "./RankingTable";
import StatSummaryGrid from "./ui/StatSummaryGrid";
import { RankingEntry } from "@/lib/rankings";
import { CritereDefinition, Journee, Match } from "@/types";
import { getLocalizedName, getJourneeDisplayName } from "@/lib/utils";
import { ShareBrandingInfo } from "./MatchShareCard";
import { useTranslations } from "@/lib/i18n";

interface JourneePageClientProps {
  journee: Journee & { saison?: { id: string; nom: string } };
  matches: (Match & { credibility?: number | null; totalVotes?: number })[];
  refereeRanking: RankingEntry[];
  globalRanking: RankingEntry[];
  varAverage: number | null;
  assistantAverage: number | null;
  totalVotes: number;
  criteresDefinitions: CritereDefinition[];
  shareBranding: ShareBrandingInfo | null;
}

export default function JourneePageClient({
  journee,
  matches,
  refereeRanking,
  globalRanking,
  varAverage,
  assistantAverage,
  totalVotes,
  criteresDefinitions,
  shareBranding,
}: JourneePageClientProps) {
  const { t, locale } = useTranslations();
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    // Afficher le skeleton pendant un court instant pour une meilleure UX
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm">
          {t("common.backToHome")}
        </Link>
        <h1 className="text-3xl font-bold mt-2">
          {getJourneeDisplayName(journee, locale)}
          {journee.saison && (
            <span className="text-lg font-normal text-gray-500 ml-2">
              ({journee.saison.nom})
            </span>
          )}
        </h1>
      </div>

      {/* Meilleur arbitre en haut */}
      {refereeRanking[0] && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">
            {t("journee.bestReferee")}
          </p>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {getLocalizedName(locale, {
              defaultValue: refereeRanking[0].nom,
              fr: refereeRanking[0].nom,
              en: refereeRanking[0].nom_en ?? undefined,
              ar: refereeRanking[0].nom_ar ?? undefined,
            })}
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {t("common.globalNote")}: {refereeRanking[0].moyenne.toFixed(2)} / 5
          </p>
        </div>
      )}

      {/* Section Matchs */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">{t("journee.matchesTitle")}</h2>
        {isInitialLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <MatchCardSkeleton key={i} />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">{t("journee.noMatches")}</p>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
              <MatchCardClient
                key={match.id}
                match={match}
                criteresDefs={criteresDefinitions}
                shareBranding={shareBranding}
                credibility={match.credibility}
                totalVotes={match.totalVotes}
              />
            ))}
          </div>
        )}
      </section>

      {/* Classement global */}
      {globalRanking.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">{t("journee.generalRankingTitle")}</h2>
          <RankingTable
            entries={globalRanking}
            criteres={criteresDefinitions}
            locale={locale}
            t={t}
          />
        </section>
      )}

      {/* Section Note VAR */}
      {varAverage !== null && (
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold mb-4">{t("journee.varRankingTitle")}</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("home.matchStats.var")}
              </span>
              {totalVotes > 0 && (
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {t("matchDetail.statsPreviewVotes", { count: totalVotes })}
                </span>
              )}
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {varAverage.toFixed(2)}<span className="text-lg font-normal text-gray-500 dark:text-gray-400">/5</span>
            </div>
          </div>
        </section>
      )}

      {/* Section Note Assistants */}
      {assistantAverage !== null && (
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold mb-4">{t("journee.assistantRankingTitle")}</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("home.matchStats.assistants")}
              </span>
              {totalVotes > 0 && (
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {t("matchDetail.statsPreviewVotes", { count: totalVotes })}
                </span>
              )}
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {assistantAverage.toFixed(2)}<span className="text-lg font-normal text-gray-500 dark:text-gray-400">/5</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

