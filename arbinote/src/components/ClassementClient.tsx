"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLocalizedName, getJourneeDisplayName } from "@/lib/utils";
import { useTranslations } from "@/lib/i18n";
import JourneeRankingClient from "./JourneeRankingClient";
import ClassementPageSkeleton from "./ClassementPageSkeleton";

interface ClassementClientProps {
  current: any;
  previous: any;
  currentRanking: any[];
  previousRanking: any[];
  topVarMatches: any[];
  topAssistantMatches: any[];
  locale: string;
}

export default function ClassementClient({
  current,
  previous,
  currentRanking,
  previousRanking,
  topVarMatches,
  topAssistantMatches,
  locale,
}: ClassementClientProps) {
  const { t } = useTranslations();
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Gérer le chargement initial
  useEffect(() => {
    // Désactiver le chargement initial après un délai pour montrer le skeleton avec animation
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  if (isInitialLoading) {
    return <ClassementPageSkeleton />;
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 text-gray-900 dark:text-white">{t("classement.title")}</h1>
        </div>
        <div className="flex gap-2 print:hidden">
          {current && (
            <a
              href={`/api/classement/export?journeeId=${current.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium whitespace-nowrap"
            >
              {t("export.csv")}
            </a>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium whitespace-nowrap"
          >
            {t("export.pdf")}
          </button>
        </div>
      </div>

      {/* Classement par journée */}
      <section className="space-y-4 sm:space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            {t("classement.refereeRankingByJournee") || "Classement des arbitres par journée"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("classement.refereeRankingByJourneeDescription") || "Classement des arbitres centraux pour les journées courante et précédente"}
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {current && (
            <JourneeRankingClient
              journee={current}
              ranking={currentRanking}
              locale={locale}
            />
          )}
          {previous && (
            <JourneeRankingClient
              journee={previous}
              ranking={previousRanking}
              locale={locale}
            />
          )}
        </div>

        {!current && !previous && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("classement.noJournees") || "Aucune journée disponible"}</p>
        )}
      </section>

      {/* Top matchs VAR et Assistants */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            {t("classement.topMatches") || "Meilleurs matchs"}
          </h2>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Top 5 matchs VAR */}
          <div className="rounded-xl sm:rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-3 sm:p-4 md:p-6 shadow-sm">
            <div className="mb-3 sm:mb-4">
              <p className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">{t("classement.topMatchesSubtitle")}</p>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">{t("classement.topVarMatches")}</h3>
            </div>
            {topVarMatches.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("classement.noMatchesForCategory") || "Aucun match disponible"}</p>
            ) : (
              <ul className="space-y-3">
                {topVarMatches.map((item, index) => {
                  const match = item.match;
                  const homeTeam = match.equipe_home;
                  const awayTeam = match.equipe_away;
                  const journee = match.journee;

                  const homeName = getLocalizedName(locale, {
                    defaultValue: homeTeam.nom,
                    fr: homeTeam.nom,
                    en: homeTeam.nom_en ?? homeTeam.nom,
                    ar: homeTeam.nom_ar ?? homeTeam.nom,
                  });
                  const awayName = getLocalizedName(locale, {
                    defaultValue: awayTeam.nom,
                    fr: awayTeam.nom,
                    en: awayTeam.nom_en ?? awayTeam.nom,
                    ar: awayTeam.nom_ar ?? awayTeam.nom,
                  });

                  const hasScore =
                    match.score_home !== null &&
                    match.score_home !== undefined &&
                    match.score_away !== null &&
                    match.score_away !== undefined;

                  return (
                    <li key={match.id} className="rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-700 px-3 sm:px-4 py-2 sm:py-3 hover:border-blue-200 dark:hover:border-blue-700 transition bg-white dark:bg-gray-800">
                      <Link href={`/matches/${match.id}`} className="block">
                        <div className="flex items-center justify-between mb-2 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 shrink-0">#{index + 1}</span>
                            {journee && (
                              <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 shrink-0">
                                {getJourneeDisplayName(journee, locale)}
                              </span>
                            )}
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">{item.average.toFixed(2)}</p>
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{t("common.globalNote")}</p>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white break-words line-clamp-2">{homeName}</span>
                          </div>
                          <div className="shrink-0 text-center">
                            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">
                              {hasScore ? `${match.score_home} - ${match.score_away}` : "VS"}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0 text-right sm:text-left">
                            <span className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white break-words line-clamp-2">{awayName}</span>
                          </div>
                        </div>
                        <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {t("classement.voteCount", { count: item.voteCount }) || `${item.voteCount} vote(s)`}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Top 5 matchs Assistants */}
          <div className="rounded-xl sm:rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-3 sm:p-4 md:p-6 shadow-sm">
            <div className="mb-3 sm:mb-4">
              <p className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">{t("classement.topMatchesSubtitle")}</p>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">{t("classement.topAssistantMatches")}</h3>
            </div>
            {topAssistantMatches.length > 0 ? (
              <ul className="space-y-3">
                {topAssistantMatches.map((item, index) => {
                  const match = item.match;
                  const homeTeam = match.equipe_home;
                  const awayTeam = match.equipe_away;
                  const journee = match.journee;

                  const homeName = getLocalizedName(locale, {
                    defaultValue: homeTeam.nom,
                    fr: homeTeam.nom,
                    en: homeTeam.nom_en ?? homeTeam.nom,
                    ar: homeTeam.nom_ar ?? homeTeam.nom,
                  });
                  const awayName = getLocalizedName(locale, {
                    defaultValue: awayTeam.nom,
                    fr: awayTeam.nom,
                    en: awayTeam.nom_en ?? awayTeam.nom,
                    ar: awayTeam.nom_ar ?? awayTeam.nom,
                  });

                  const hasScore =
                    match.score_home !== null &&
                    match.score_home !== undefined &&
                    match.score_away !== null &&
                    match.score_away !== undefined;

                  return (
                    <li key={match.id} className="rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-700 px-3 sm:px-4 py-2 sm:py-3 hover:border-blue-200 dark:hover:border-blue-700 transition bg-white dark:bg-gray-800">
                      <Link href={`/matches/${match.id}`} className="block">
                        <div className="flex items-center justify-between mb-2 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 shrink-0">#{index + 1}</span>
                            {journee && (
                              <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 shrink-0">
                                {getJourneeDisplayName(journee, locale)}
                              </span>
                            )}
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">{item.average.toFixed(2)}</p>
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{t("common.globalNote")}</p>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white break-words line-clamp-2">{homeName}</span>
                          </div>
                          <div className="shrink-0 text-center">
                            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">
                              {hasScore ? `${match.score_home} - ${match.score_away}` : "VS"}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0 text-right sm:text-left">
                            <span className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white break-words line-clamp-2">{awayName}</span>
                          </div>
                        </div>
                        <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {t("classement.voteCount", { count: item.voteCount }) || `${item.voteCount} vote(s)`}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("classement.noMatchesForCategory") || "Aucun match disponible"}</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

