import HomeClient from "@/components/HomeClient";
import { Match, MatchVoteSummary, CritereCategory, CritereDefinition } from "@/types";
import { getServerLocale, translate } from "@/lib/i18nServer";
import {
  fetchFederationsWithLeagues,
  fetchJourneesBySaison,
  fetchLatestSaison,
  fetchMatchesByJournee,
  fetchVotesByMatchIds,
  fetchCritereDefinitions,
} from "@/lib/dataAccess";
import { fetchCurrentJournee } from "@/lib/currentJournee";
import { getActiveLeagueId } from "@/lib/leagueSelection";
import { getLocalizedName, formatDateOnly } from "@/lib/utils";
import Image from "next/image";
import StructuredData from "@/components/StructuredData";
import type { Metadata } from "next";
import { getSEODescription, getSEOKeywords } from "@/lib/seo";
import { getMatchCredibility } from "@/lib/matchCredibility";
import { getDataSource } from "@/lib/db";
import { Vote } from "@/lib/entities";

interface HomePageProps {
  searchParams: Promise<{ journeeId?: string }>;
}

type JourneeWithMatches = {
  id: string;
  numero: number | null;
  nom?: string | null;
  nom_en?: string | null;
  nom_ar?: string | null;
  date_journee?: string | null;
  dateLabel?: string | null;
  matches: (Match & { credibility?: number | null; totalVotes?: number })[];
};

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  const leagueId = await getActiveLeagueId()
  const federations = await fetchFederationsWithLeagues()
  
  let activeLeague = null
  if (leagueId) {
    for (const fed of federations) {
      const league = fed.leagues.find((l) => l.id === leagueId)
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
    ? `ARBINOTE | ${leagueName} - Notation des Arbitres en Direct`
    : 'ARBINOTE | Plateforme Internationale de Notation des Arbitres'

  const description = getSEODescription(locale)
  const keywords = getSEOKeywords(locale)

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      url: baseUrl,
      siteName: 'ARBINOTE',
      locale: locale === 'ar' ? 'ar_TN' : locale === 'en' ? 'en_US' : 'fr_FR',
      alternateLocale: ['fr_FR', 'en_US', 'ar_TN'],
      type: 'website',
      images: [
        {
          url: `${baseUrl}/logo-light.png`,
          width: 1200,
          height: 630,
          alt: 'ARBINOTE - Plateforme internationale de notation des arbitres',
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${baseUrl}/logo-light.png`],
      creator: '@referee-center',
      site: '@referee-center',
    },
    alternates: {
      canonical: baseUrl,
      languages: {
        fr: `${baseUrl}/fr`,
        en: `${baseUrl}/en`,
        ar: `${baseUrl}/ar`,
        'x-default': baseUrl,
      },
    },
  }
}

export default async function Home({ searchParams }: HomePageProps) {
  const locale = await getServerLocale();
  const t = (key: string, params?: Record<string, string | number>) => translate(key, locale, params);
  const leagueId = await getActiveLeagueId();
  const params = await searchParams;
  const journeeIdFromUrl = params?.journeeId;

  const referenceDate = new Date();
  let journeesWithMatches: JourneeWithMatches[] = [];
  let defaultJourneeId: string | null = null;
  let dataError: string | null = null;
  let criteresDefinitions: CritereDefinition[] = [];

  try {
    const latestSaison = await fetchLatestSaison(leagueId ?? undefined);

    if (!latestSaison) {
      dataError = t("journees.noSeason");
    } else {
      const journees = await fetchJourneesBySaison(latestSaison.id);
      const journeesWithMatchesData = await Promise.all(
        journees.map(async (journee) => {
          const matches = (await fetchMatchesByJournee(journee.id)) as Match[];
          const dateJourneeStr = journee.date_journee
            ? typeof journee.date_journee === "string"
              ? journee.date_journee
              : journee.date_journee instanceof Date
                ? journee.date_journee.toISOString()
                : null
            : null;

          return {
            id: journee.id,
            numero: journee.numero ?? null,
            nom_fr: journee.nom_fr ?? null,
            nom_en: journee.nom_en ?? null,
            nom_ar: journee.nom_ar ?? null,
            date_journee: dateJourneeStr,
            dateLabel: dateJourneeStr ? formatDateOnly(dateJourneeStr, locale) : null,
            matches,
          };
        })
      );

      journeesWithMatchesData.sort((a, b) => {
        // Priorité 1: Trier par numero (ordre croissant : 1, 2, 3... 15, 31)
        if (a.numero !== null && b.numero !== null) {
          return a.numero - b.numero;
        }
        if (a.numero !== null) return -1;
        if (b.numero !== null) return 1;
        // Priorité 2: Trier par date_journee (plus récentes en premier)
        if (a.date_journee && b.date_journee) {
          return new Date(b.date_journee).getTime() - new Date(a.date_journee).getTime();
        }
        if (a.date_journee) return -1;
        if (b.date_journee) return 1;
        // Priorité 3: Trier par nom_fr (ordre alphabétique)
        const aNom = a.nom_fr ?? "";
        const bNom = b.nom_fr ?? "";
        return aNom.localeCompare(bNom);
      });

      const currentJourneeData = await fetchCurrentJournee(leagueId ?? undefined, referenceDate);
      const fallbackId = currentJourneeData?.id || journeesWithMatchesData[0]?.id || null;

      defaultJourneeId =
        journeeIdFromUrl && journeesWithMatchesData.some((journee) => journee.id === journeeIdFromUrl)
          ? journeeIdFromUrl
          : fallbackId;

      const matchIds = journeesWithMatchesData.flatMap((journee) =>
        journee.matches.map((match) => match.id)
      );

      let voteSummaryMap = new Map<string, MatchVoteSummary>();

      if (matchIds.length > 0) {
        const [votes, criteresDefsFromDb] = await Promise.all([
          fetchVotesByMatchIds(matchIds),
          fetchCritereDefinitions(),
        ]);
        criteresDefinitions = criteresDefsFromDb as CritereDefinition[];

        type CategoryKey = CritereCategory;
        interface CategoryAccumulator {
          total: number;
          count: number;
        }
        interface VoteAccumulator {
          count: number;
          globalTotal: number;
          categories: Record<CategoryKey, CategoryAccumulator>;
        }

        const categoryMap = new Map<string, CategoryKey>();
        criteresDefinitions.forEach((critere) => {
          if (critere?.id) {
            categoryMap.set(critere.id, critere.categorie as CategoryKey);
          }
        });

        const tempMap = new Map<string, VoteAccumulator>();

        votes.forEach((vote) => {
          if (!vote?.match_id) return;
          const matchId = vote.match_id as string;
          const accumulator =
            tempMap.get(matchId) ??
            {
              count: 0,
              globalTotal: 0,
              categories: {
                arbitre: { total: 0, count: 0 },
                var: { total: 0, count: 0 },
                assistant: { total: 0, count: 0 },
              },
            };

          const noteValue =
            typeof vote.note_globale === "string"
              ? parseFloat(vote.note_globale)
              : typeof vote.note_globale === "number"
              ? vote.note_globale
              : null;

          if (noteValue !== null && Number.isFinite(noteValue)) {
            accumulator.globalTotal += noteValue;
          }
          accumulator.count += 1;

          const criteresData = vote.criteres ?? {};
          Object.entries(criteresData).forEach(([critereId, rawValue]) => {
            const numericValue =
              typeof rawValue === "number" ? rawValue : parseFloat(String(rawValue));
            if (!Number.isFinite(numericValue) || numericValue <= 0) {
              return;
            }
            const category = categoryMap.get(critereId) ?? "arbitre";
            const bucket = accumulator.categories[category];
            bucket.total += numericValue;
            bucket.count += 1;
          });

          tempMap.set(matchId, accumulator);
        });

        voteSummaryMap = new Map(
          Array.from(tempMap.entries()).map<[string, MatchVoteSummary]>(([matchId, accumulator]) => {
            const average = (total: number, count: number) =>
              count > 0 ? Math.round((total / count) * 100) / 100 : null;

            return [
              matchId,
              {
                totalVotes: accumulator.count,
                globalAverage: average(accumulator.globalTotal, accumulator.count),
                arbitreAverage: average(
                  accumulator.categories.arbitre.total,
                  accumulator.categories.arbitre.count
                ),
                varAverage: average(
                  accumulator.categories.var.total,
                  accumulator.categories.var.count
                ),
                assistantAverage: average(
                  accumulator.categories.assistant.total,
                  accumulator.categories.assistant.count
                ),
              },
            ];
          })
        );
      }

      journeesWithMatches = journeesWithMatchesData.map((journee) => ({
        ...journee,
        matches: journee.matches.map((match) => ({
          ...match,
          voteSummary: voteSummaryMap.get(match.id) ?? null,
        })),
      }));

      // Précharger la crédibilité pour tous les matches
      const allMatchIds = journeesWithMatches.flatMap((journee) =>
        journee.matches.map((match) => match.id)
      );

      if (allMatchIds.length > 0) {
        // Récupérer le nombre de votes par match pour la crédibilité
        const dataSource = await getDataSource();
        const voteRepo = dataSource.getRepository<Vote>("votes");
        const votesByMatch = await Promise.all(
          allMatchIds.map(async (matchId) => {
            const votes = await voteRepo.find({
              where: { match_id: matchId },
              select: ["id"],
            });
            return { matchId, totalVotes: votes.length };
          })
        );
        const totalVotesMap = new Map(
          votesByMatch.map((v) => [v.matchId, v.totalVotes])
        );

        // Calculer la crédibilité pour tous les matches en parallèle
        const credibilityPromises = allMatchIds.map(async (matchId) => {
          const credibility = await getMatchCredibility(matchId);
          return { matchId, credibility };
        });
        const credibilityResults = await Promise.all(credibilityPromises);
        const credibilityMap = new Map(
          credibilityResults.map((r) => [r.matchId, r.credibility])
        );

        // Ajouter la crédibilité et le nombre de votes à chaque match
        journeesWithMatches = journeesWithMatches.map((journee) => ({
          ...journee,
          matches: journee.matches.map((match) => ({
            ...match,
            credibility: credibilityMap.get(match.id) ?? null,
            totalVotes: totalVotesMap.get(match.id) ?? 0,
          })),
        }));
      }
    }
  } catch (err) {
    console.error("Error loading journees for home page:", err);
    dataError = t("common.error");
  }

  // Récupérer la fédération et ligue active
  const federations = await fetchFederationsWithLeagues();
  let activeLeague = null;
  let activeFederation = null;

  if (leagueId) {
    for (const fed of federations) {
      const league = fed.leagues.find((l) => l.id === leagueId);
      if (league) {
        activeLeague = league;
        activeFederation = fed;
        break;
      }
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  
  // Structured Data JSON-LD pour le SEO
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ARBINOTE',
    url: baseUrl,
    logo: `${baseUrl}/logo-light.png`,
    description: locale === 'ar' 
      ? 'أربي نوت هي المنصة الدولية المرجعية لتقييم ومقارنة حكام كرة القدم من جميع البطولات'
      : locale === 'en'
      ? 'ARBINOTE is the leading international platform to rate and compare football referees from all leagues worldwide'
      : 'ARBINOTE est la plateforme internationale de référence pour noter et comparer les arbitres de football de tous les championnats',
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      availableLanguage: ['French', 'English', 'Arabic'],
    },
  }

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'ARBINOTE',
    url: baseUrl,
    description: locale === 'ar'
      ? 'منصة تقييم الحكام الدولية - جميع البطولات'
      : locale === 'en'
      ? 'International Referee Rating Platform - All Leagues Worldwide'
      : 'Plateforme internationale de notation des arbitres - Tous les championnats',
    inLanguage: locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-FR',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }

  const sportsOrganizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'SportsOrganization',
    name: activeLeague 
      ? getLocalizedName(locale, {
          defaultValue: activeLeague.nom,
          fr: activeLeague.nom,
          en: activeLeague.nom_en ?? activeLeague.nom,
          ar: activeLeague.nom_ar ?? activeLeague.nom,
        })
      : 'Football League',
    sport: 'Football',
    location: {
      '@type': 'Place',
      name: 'Worldwide',
    },
  }

  return (
    <>
      <StructuredData data={organizationSchema} />
      <StructuredData data={websiteSchema} />
      {activeLeague && <StructuredData data={sportsOrganizationSchema} />}
      <div className="w-full max-w-4xl mx-auto px-2 sm:px-4">
      {/* Logo ARBINOTE */}
      <div className="text-center mb-6 sm:mb-8">
        <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          {t("home.subtitle") ||
            "Plateforme de référence pour noter et comparer les arbitres de Ligue 1 tunisienne : calendrier, classements et votes en direct."}
        </p>
      </div>

      {/* Logos de la fédération et ligue */}
      {activeFederation && activeLeague && (
        <div className="flex flex-col items-center justify-center gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            {activeFederation.logo_url && (
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 shrink-0 bg-white dark:bg-gray-800 rounded-lg p-2 shadow-sm border border-gray-200 dark:border-gray-700">
                <Image
                  src={activeFederation.logo_url}
                  alt={getLocalizedName(locale, {
                    defaultValue: activeFederation.nom,
                    fr: activeFederation.nom,
                    en: activeFederation.nom_en ?? undefined,
                    ar: activeFederation.nom_ar ?? undefined,
                  })}
                  fill
                  sizes="(max-width: 640px) 80px, (max-width: 768px) 96px, 112px"
                  className="object-contain"
                />
              </div>
            )}
            {activeLeague.logo_url && (
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 shrink-0 bg-white dark:bg-gray-800 rounded-lg p-2 shadow-sm border border-gray-200 dark:border-gray-700">
                <Image
                  src={activeLeague.logo_url}
                  alt={getLocalizedName(locale, {
                    defaultValue: activeLeague.nom,
                    fr: activeLeague.nom,
                    en: activeLeague.nom_en ?? undefined,
                    ar: activeLeague.nom_ar ?? undefined,
                  })}
                  fill
                  sizes="(max-width: 640px) 80px, (max-width: 768px) 96px, 112px"
                  className="object-contain"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {dataError && (
        <div className="p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4 sm:mb-6">
          <p className="text-red-800 dark:text-red-200 text-sm sm:text-base">
            {dataError}
          </p>
        </div>
      )}

      {!dataError && journeesWithMatches.length === 0 && (
        <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-2 text-sm sm:text-base">{t("common.emptyMatchesTitle")}</p>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-500">{t("common.emptyMatchesDescription")}</p>
        </div>
      )}

      {!dataError && journeesWithMatches.length > 0 && (
        <HomeClient
          journees={journeesWithMatches}
          defaultJourneeId={defaultJourneeId}
          criteresDefs={criteresDefinitions}
          shareContext={{
            leagueName: activeLeague
              ? getLocalizedName(locale, {
                  defaultValue: activeLeague.nom,
                  fr: activeLeague.nom,
                  en: activeLeague.nom_en ?? activeLeague.nom,
                  ar: activeLeague.nom_ar ?? activeLeague.nom,
                })
              : null,
            leagueLogoUrl: activeLeague?.logo_url ?? null,
            federationName: activeFederation
              ? getLocalizedName(locale, {
                  defaultValue: activeFederation.nom,
                  fr: activeFederation.nom,
                  en: activeFederation.nom_en ?? activeFederation.nom,
                  ar: activeFederation.nom_ar ?? activeFederation.nom,
                })
              : null,
            federationLogoUrl: activeFederation?.logo_url ?? null,
          }}
        />
      )}
      </div>
    </>
  );
}
