import RankingTable from "@/components/RankingTable";
import { buildRanking } from "@/lib/rankings";
import { CritereDefinition, Vote } from "@/types";
import { getServerLocale, translate } from "@/lib/i18nServer";
import { getLocalizedName, getJourneeDisplayName, formatDateOnly } from "@/lib/utils";
import TopMatchesList from "@/components/TopMatchesList";
import {
  fetchArbitres,
  fetchCritereDefinitions,
  fetchJourneesBySaison,
  fetchLatestSaison,
  fetchMatchesByJourneeIds,
  fetchVotesByMatchIds,
  fetchTopMatchesByCriteres,
  fetchFederationsWithLeagues,
} from "@/lib/dataAccess";
import { getActiveLeagueId } from "@/lib/leagueSelection";
import type { Metadata } from "next";
import { getSEODescription, getSEOKeywords } from "@/lib/seo";
import StructuredData from "@/components/StructuredData";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

async function getLatestSaison(leagueId?: string | null) {
  return fetchLatestSaison(leagueId);
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  const leagueId = await getActiveLeagueId()
  const federations = await fetchFederationsWithLeagues()
  
  let activeLeague = null
  if (leagueId) {
    for (const fed of federations) {
      const league = fed.leagues.find((l: any) => l.id === leagueId)
      if (league) {
        activeLeague = league
        break
      }
    }
  }

  const leagueName = activeLeague
    ? getLocalizedName(locale, {
        defaultValue: activeLeague.nom,
        fr: activeLeague.nom,
        en: activeLeague.nom_en ?? activeLeague.nom,
        ar: activeLeague.nom_ar ?? activeLeague.nom,
      })
    : ''

  const title = leagueName
    ? `Statistiques ${leagueName} | ARBINOTE`
    : 'Statistiques | ARBINOTE'

  const descriptionFr = `Consultez les statistiques complètes ${leagueName ? `de ${leagueName}` : ''} : classements des arbitres, meilleurs matchs, performances par journée et analyses détaillées.`
  const descriptionEn = `View complete statistics ${leagueName ? `for ${leagueName}` : ''}: referee rankings, best matches, performances by matchday and detailed analysis.`
  const descriptionAr = `اطلع على الإحصائيات الكاملة ${leagueName ? `لـ ${leagueName}` : ''}: ترتيب الحكام، أفضل المباريات، الأداء حسب الجولة والتحليل التفصيلي.`

  const description = locale === 'ar' ? descriptionAr : locale === 'en' ? descriptionEn : descriptionFr

  return {
    title,
    description,
    keywords: [
      ...getSEOKeywords(locale),
      'statistiques',
      'statistics',
      'إحصائيات',
      'classement arbitres',
      'meilleurs matchs',
      'performances arbitres',
      'analyse arbitrage',
    ],
    openGraph: {
      title,
      description,
      url: `${baseUrl}/statistic`,
      siteName: 'ARBINOTE',
      locale: locale === 'ar' ? 'ar_TN' : locale === 'en' ? 'en_US' : 'fr_FR',
      alternateLocale: ['fr_FR', 'en_US', 'ar_TN'],
      type: 'website',
      images: [
        {
          url: `${baseUrl}/logo-light.png`,
          width: 1200,
          height: 630,
          alt: 'Statistiques - ARBINOTE',
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${baseUrl}/logo-light.png`],
    },
    alternates: {
      canonical: `${baseUrl}/statistic`,
      languages: {
        fr: `${baseUrl}/fr/statistic`,
        en: `${baseUrl}/en/statistic`,
        ar: `${baseUrl}/ar/statistic`,
      },
    },
  }
}

export default async function StatisticPage() {
  const locale = await getServerLocale();
  const t = (key: string, params?: Record<string, string | number>) => translate(key, locale, params);
  const leagueId = await getActiveLeagueId();
  const saison = await getLatestSaison(leagueId ?? undefined);

  if (!saison) {
    return (
      <div className="w-full max-w-3xl mx-auto px-2 sm:px-4">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-gray-900 dark:text-white">{t("classement.title")}</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">{t("classement.noSeason")}</p>
      </div>
    );
  }

  const journees = await fetchJourneesBySaison(saison.id);
  const journeeIds = journees.map((j) => j.id);

  const matches = await fetchMatchesByJourneeIds(journeeIds);

  const matchIds = matches?.map((m) => m.id) ?? [];

  const votes = (await fetchVotesByMatchIds(matchIds)) as Vote[];

  const criteresDefinitions = (await fetchCritereDefinitions()) as unknown as CritereDefinition[];

  const definitions = criteresDefinitions as CritereDefinition[];
  const arbitreCriteres = definitions.filter((c) => c.categorie === "arbitre");
  const generalCriteres = definitions;

  const refereeRanking = buildRanking(votes, {
    criteres: arbitreCriteres,
    includeCategories: ["arbitre"],
  });

  const generalRanking = buildRanking(votes, {
    criteres: generalCriteres,
    includeCategories: ["arbitre", "var", "assistant"],
  });

  const matchJourneeMap = new Map((matches || []).map((match) => [match.id, match.journee_id]));

  const votesByJournee = new Map<string, Vote[]>();
  votes.forEach((vote) => {
    const journeeId = matchJourneeMap.get(vote.match_id);
    if (!journeeId) return;
    const group = votesByJournee.get(journeeId) ?? [];
    group.push(vote);
    votesByJournee.set(journeeId, group);
  });

  const bestByJournee = journees.map((journee) => {
    const journeeVotes = votesByJournee.get(journee.id) ?? [];
    const ranking = buildRanking(journeeVotes, {
      criteres: arbitreCriteres,
      includeCategories: ["arbitre"],
    });
    return { journee, best: ranking[0] ?? null };
  });

  // Données pour les aperçus et stats
  const rankingPreview = {
    referees: refereeRanking.slice(0, 5),
    general: generalRanking.slice(0, 5),
  };

  const { total: totalReferees } = await fetchArbitres();
  const statsSummary = {
    totalReferees,
    totalMatches: matchIds.length,
    totalJournees: journees.length,
    totalVotes: votes.length,
    seasonLabel: saison.nom,
  };

  // Structured Data JSON-LD pour le SEO
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: locale === 'ar' ? 'الرئيسية' : locale === 'en' ? 'Home' : 'Accueil',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: locale === 'ar' ? 'الإحصائيات' : locale === 'en' ? 'Statistics' : 'Statistiques',
        item: `${baseUrl}/statistic`,
      },
    ],
  }

  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: locale === 'ar' ? 'الإحصائيات' : locale === 'en' ? 'Statistics' : 'Statistiques',
    description: locale === 'ar'
      ? 'إحصائيات شاملة عن الحكام والمباريات'
      : locale === 'en'
      ? 'Comprehensive statistics about referees and matches'
      : 'Statistiques complètes sur les arbitres et les matchs',
    url: `${baseUrl}/statistic`,
    inLanguage: locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-FR',
  }

  return (
    <>
      <StructuredData data={breadcrumbSchema} />
      <StructuredData data={webPageSchema} />
      <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 text-gray-900 dark:text-white">{t("classement.title")}</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            {t("classement.seasonLabel")} {saison.nom}
          </p>
        </div>
      </div>

      {/* Vue d'ensemble (StatsPanel) */}
      <div className="rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800 p-4 sm:p-6 shadow-lg">
        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-300 mb-1">
          {t("home.stats.title", { season: statsSummary.seasonLabel })}
        </p>
        <h3 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4 truncate text-gray-900 dark:text-white">{statsSummary.seasonLabel}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <div className="rounded-xl sm:rounded-2xl bg-gray-50 dark:bg-white/10 px-2 sm:px-4 py-2 sm:py-3">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-300">{t("home.stats.referees")}</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{statsSummary.totalReferees}</p>
          </div>
          <div className="rounded-xl sm:rounded-2xl bg-gray-50 dark:bg-white/10 px-2 sm:px-4 py-2 sm:py-3">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-300">{t("home.stats.matches")}</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{statsSummary.totalMatches}</p>
          </div>
          <div className="rounded-xl sm:rounded-2xl bg-gray-50 dark:bg-white/10 px-2 sm:px-4 py-2 sm:py-3">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-300">{t("home.stats.journees")}</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{statsSummary.totalJournees}</p>
          </div>
          <div className="rounded-xl sm:rounded-2xl bg-gray-50 dark:bg-white/10 px-2 sm:px-4 py-2 sm:py-3">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-300">{t("home.stats.votes")}</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{statsSummary.totalVotes}</p>
          </div>
        </div>
      </div>

      {/* Aperçu basé sur les dernières notes */}
      <section className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <div className="rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-3 sm:p-4 md:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">{t("home.rankings.subtitle")}</p>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">{t("home.rankings.referees")}</h3>
            </div>
          </div>
          {rankingPreview.referees.length === 0 ? (
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{t("home.rankings.empty")}</p>
          ) : (
            <ul className="space-y-2 sm:space-y-3">
              {rankingPreview.referees.map((entry, index) => (
                <li
                  key={entry.arbitreId}
                  className="flex items-center justify-between rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-700 px-3 sm:px-4 py-2 sm:py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {index + 1}.{" "}
                      {getLocalizedName(locale, {
                        defaultValue: entry.nom,
                        fr: entry.nom,
                        en: entry.nom_en ?? undefined,
                        ar: entry.nom_ar ?? undefined,
                      })}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{t("home.rankings.votes", { count: entry.votes })}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">{entry.moyenne.toFixed(2)}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{t("common.globalNote")}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-3 sm:p-4 md:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">{t("home.rankings.subtitle")}</p>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">{t("home.rankings.general")}</h3>
            </div>
          </div>
          {rankingPreview.general.length === 0 ? (
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{t("home.rankings.empty")}</p>
          ) : (
            <ul className="space-y-2 sm:space-y-3">
              {rankingPreview.general.map((entry, index) => (
                <li
                  key={entry.arbitreId}
                  className="flex items-center justify-between rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-700 px-3 sm:px-4 py-2 sm:py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {index + 1}.{" "}
                      {getLocalizedName(locale, {
                        defaultValue: entry.nom,
                        fr: entry.nom,
                        en: entry.nom_en ?? undefined,
                        ar: entry.nom_ar ?? undefined,
                      })}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{t("home.rankings.votes", { count: entry.votes })}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">{entry.moyenne.toFixed(2)}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{t("common.globalNote")}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {refereeRanking.length > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 mb-1">{t("classement.bestRefereeOverall")}</p>
          <p className="text-2xl font-bold text-blue-900">
            {getLocalizedName(locale, {
              defaultValue: refereeRanking[0].nom,
              fr: refereeRanking[0].nom,
              en: refereeRanking[0].nom_en ?? undefined,
              ar: refereeRanking[0].nom_ar ?? undefined,
            })}
          </p>
          <p className="text-sm text-blue-700">
            {t("common.globalNote")}: {refereeRanking[0].moyenne.toFixed(2)} / 5
          </p>
        </div>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold mb-2">{t("classement.refereeRankingTitle")}</h2>
          <p className="text-sm text-gray-500">{t("classement.refereeRankingDescription")}</p>
        </div>
        <RankingTable entries={refereeRanking} criteres={arbitreCriteres} locale={locale} t={t} />
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">{t("classement.generalRankingTitle")}</h2>
          <p className="text-sm text-gray-500">{t("classement.generalRankingDescription")}</p>
        </div>

        {/* Top 5 matchs VAR et Assistants */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Top 5 matchs VAR */}
          <div className="rounded-xl sm:rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-3 sm:p-4 md:p-6 shadow-sm">
            <div className="mb-3 sm:mb-4">
              <p className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">{t("classement.topMatchesSubtitle")}</p>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">{t("classement.topVarMatches")}</h3>
            </div>
            <TopMatchesList matchIds={matchIds} category="var" locale={locale} t={t} />
          </div>

          {/* Top 5 matchs Assistants */}
          <div className="rounded-xl sm:rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-3 sm:p-4 md:p-6 shadow-sm">
            <div className="mb-3 sm:mb-4">
              <p className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">{t("classement.topMatchesSubtitle")}</p>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">{t("classement.topAssistantMatches")}</h3>
            </div>
            <TopMatchesList matchIds={matchIds} category="assistant" locale={locale} t={t} />
          </div>
        </div>
      </section>

      <section className="space-y-2 sm:space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">{t("classement.bestByJournee")}</h2>
        {bestByJournee.length === 0 && <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">{t("journee.noVotes")}</p>}
        {bestByJournee
          .filter((item) => item.best)
          .map(({ journee, best }) => (
            <div
              key={journee.id}
              className="flex items-center justify-between p-3 sm:p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  {getJourneeDisplayName(journee, locale)}
                </p>
                <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {best
                    ? getLocalizedName(locale, {
                        defaultValue: best.nom,
                        fr: best.nom,
                        en: best.nom_en ?? undefined,
                        ar: best.nom_ar ?? undefined,
                      })
                    : t("journee.noVotes")}
                </p>
              </div>
              {best && (
                <p className="text-blue-600 dark:text-blue-400 font-semibold text-sm sm:text-base shrink-0 ml-2">{best.moyenne.toFixed(2)} / 5</p>
              )}
            </div>
          ))}
      </section>
      </div>
    </>
  );
}

