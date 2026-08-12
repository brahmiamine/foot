import { notFound } from "next/navigation";
import VoteSectionWrapper from "@/components/VoteSectionWrapper";
import { formatDate, getLocalizedName, canVoteMatch } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { getServerLocale, translate } from "@/lib/i18nServer";
import { CritereDefinition, Match as MatchType, Arbitre as ArbitreType } from "@/types";
import { fetchCritereDefinitions, fetchMatchById } from "@/lib/dataAccess";
import ArbitreLink from "@/components/ArbitreLink";
import LiveMatchBadge from "@/components/LiveMatchBadge";
import StructuredData from "@/components/StructuredData";
import AlertBanner from "@/components/ui/AlertBanner";
import VotedBadge from "@/components/VotedBadge";
import MatchCredibility from "@/components/MatchCredibility";
import MatchDetailBadges from "@/components/MatchDetailBadges";
import type { Metadata } from "next";

async function getMatch(id: string) {
  return fetchMatchById(id);
}

async function getCriteresDefinitions(): Promise<CritereDefinition[]> {
  const data = await fetchCritereDefinitions();
  return data as unknown as CritereDefinition[];
}

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const match = await fetchMatchById(id)
  const locale = await getServerLocale()

  if (!match) {
    return {
      title: 'Match introuvable | ARBINOTE',
    }
  }

  const homeName = getLocalizedName(locale, {
    defaultValue: match.equipe_home.nom,
    fr: match.equipe_home.nom,
    en: match.equipe_home.nom_en ?? match.equipe_home.nom,
    ar: match.equipe_home.nom_ar ?? match.equipe_home.nom,
  })

  const awayName = getLocalizedName(locale, {
    defaultValue: match.equipe_away.nom,
    fr: match.equipe_away.nom,
    en: match.equipe_away.nom_en ?? match.equipe_away.nom,
    ar: match.equipe_away.nom_ar ?? match.equipe_away.nom,
  })

  const scoreText =
    typeof match.score_home === 'number' && typeof match.score_away === 'number'
      ? `${match.score_home} - ${match.score_away}`
      : ''

  const title = scoreText
    ? `${homeName} ${scoreText} ${awayName} | ARBINOTE`
    : `${homeName} vs ${awayName} | ARBINOTE`

  const descriptionFr = `Match ${homeName} vs ${awayName}${scoreText ? ` (${scoreText})` : ''}. Consultez les détails du match, l'arbitre assigné et votez pour évaluer la performance sur ARBINOTE.`
  const descriptionEn = `Match ${homeName} vs ${awayName}${scoreText ? ` (${scoreText})` : ''}. View match details, assigned referee and vote to rate the performance on ARBINOTE.`
  const descriptionAr = `مباراة ${homeName} ضد ${awayName}${scoreText ? ` (${scoreText})` : ''}. راجع تفاصيل المباراة، الحكم المعين وصوّت لتقييم الأداء على ARBINOTE.`

  const description = locale === 'ar' ? descriptionAr : locale === 'en' ? descriptionEn : descriptionFr

  return {
    title,
    description,
    keywords: [
      homeName,
      awayName,
      'match',
      'football',
      'soccer',
      'résultat match',
      'arbitre match',
      'notation arbitre',
      'vote arbitre',
      'évaluation arbitre',
      'performance arbitre',
    ],
    openGraph: {
      title,
      description,
      type: 'website',
      images: [
        {
          url: `${baseUrl}/logo-light.png`,
          width: 1200,
          height: 630,
          alt: `${homeName} vs ${awayName}`,
        },
      ],
      url: `${baseUrl}/matches/${id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${baseUrl}/logo-light.png`],
    },
    alternates: {
      canonical: `${baseUrl}/matches/${id}`,
      languages: {
        fr: `${baseUrl}/fr/matches/${id}`,
        en: `${baseUrl}/en/matches/${id}`,
        ar: `${baseUrl}/ar/matches/${id}`,
      },
    },
  }
}

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await getMatch(id);
  const criteresDefinitions = await getCriteresDefinitions();

  if (!match) {
    notFound();
  }

  const locale = await getServerLocale();
  const t = (key: string, params?: Record<string, string | number>) => translate(key, locale, params);
  const arbitre = (match.arbitre || null) as unknown as ArbitreType | null;
  const actualStartedAtISO = match.actual_started_at
    ? (typeof match.actual_started_at === "string" ? match.actual_started_at : match.actual_started_at.toISOString())
    : null;
  const canVote = canVoteMatch({ arbitre_id: match.arbitre_id, status: match.status, actual_started_at: actualStartedAtISO });
  const journeeLabel = match.journee?.numero;
  const saisonLabel = match.journee?.saison?.nom;
  const homeName = getLocalizedName(locale, {
    defaultValue: match.equipe_home.nom,
    fr: match.equipe_home.nom,
    en: match.equipe_home.nom_en ?? undefined,
    ar: match.equipe_home.nom_ar ?? undefined,
  });
  const awayName = getLocalizedName(locale, {
    defaultValue: match.equipe_away.nom,
    fr: match.equipe_away.nom,
    en: match.equipe_away.nom_en ?? undefined,
    ar: match.equipe_away.nom_ar ?? undefined,
  });
  const homeCity =
    match.equipe_home.city || match.equipe_home.city_en || match.equipe_home.city_ar
      ? getLocalizedName(locale, {
          defaultValue: match.equipe_home.city ?? match.equipe_home.city_en ?? match.equipe_home.city_ar ?? "",
          fr: match.equipe_home.city ?? undefined,
          en: match.equipe_home.city_en ?? undefined,
          ar: match.equipe_home.city_ar ?? undefined,
        })
      : null;
  const awayCity =
    match.equipe_away.city || match.equipe_away.city_en || match.equipe_away.city_ar
      ? getLocalizedName(locale, {
          defaultValue: match.equipe_away.city ?? match.equipe_away.city_en ?? match.equipe_away.city_ar ?? "",
          fr: match.equipe_away.city ?? undefined,
          en: match.equipe_away.city_en ?? undefined,
          ar: match.equipe_away.city_ar ?? undefined,
        })
      : null;
  const refereeName =
    arbitre && typeof arbitre === "object"
      ? getLocalizedName(locale, {
          defaultValue: arbitre.nom,
          fr: arbitre.nom,
          en: arbitre.nom_en ?? undefined,
          ar: arbitre.nom_ar ?? undefined,
        })
      : null;
  const refereeCategory =
    arbitre && typeof arbitre === "object" && (arbitre.categorie || arbitre.categorie_ar)
      ? getLocalizedName(locale, {
          defaultValue: arbitre.categorie ?? arbitre.categorie_ar ?? "",
          fr: arbitre.categorie ?? undefined,
          ar: arbitre.categorie_ar ?? undefined,
        })
      : null;

  // Vérifier si le match est en cours pour mettre le score en rouge
  const isMatchLive = match.date && (() => {
    try {
      const matchDate = typeof match.date === "string" ? new Date(match.date) : match.date;
      const now = new Date();
      if (matchDate > now) return false;
      const diffMs = now.getTime() - matchDate.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes >= 0 && diffMinutes <= 93; // Match en cours si moins de 93 min
    } catch {
      return false;
    }
  })();

  // Structured Data JSON-LD pour le SEO
  const matchDate = match.date ? (typeof match.date === 'string' ? new Date(match.date) : match.date) : null
  const sportsEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${homeName} vs ${awayName}`,
    sport: 'Football',
    startDate: matchDate ? matchDate.toISOString() : undefined,
    location: match.equipe_home.stadium
      ? {
          '@type': 'Place',
          name: match.equipe_home.stadium,
        }
      : undefined,
    homeTeam: {
      '@type': 'SportsTeam',
      name: homeName,
      logo: match.equipe_home.logo_url || undefined,
    },
    awayTeam: {
      '@type': 'SportsTeam',
      name: awayName,
      logo: match.equipe_away.logo_url || undefined,
    },
    ...(typeof match.score_home === 'number' && typeof match.score_away === 'number'
      ? {
          score: {
            '@type': 'SportsEvent',
            homeScore: match.score_home,
            awayScore: match.score_away,
          },
        }
      : {}),
    ...(arbitre && typeof arbitre === 'object'
      ? {
          official: {
            '@type': 'Person',
            name: refereeName || arbitre.nom,
            jobTitle: 'Referee',
          },
        }
      : {}),
  }

  return (
    <>
      <StructuredData data={sportsEventSchema} />
      <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 overflow-x-hidden">
      <Link
        href="/"
        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-3 sm:mb-4 inline-block text-xs sm:text-sm"
      >
        {t("common.backToHome") || "← Retour à l'accueil"}
      </Link>

      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden mb-4 sm:mb-6 w-full">
        <div className="p-2 sm:p-4 md:p-6 w-full max-w-full overflow-x-hidden">
          {/* Header avec date et journée */}
          <div className="mb-3 sm:mb-4 pb-2 sm:pb-4 border-b border-gray-100 dark:border-gray-700 w-full space-y-2">
            {/* Ligne 1: Informations du match */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span>{match.date ? formatDate(match.date, locale) : t("common.datePending")}</span>
              </div>
              {journeeLabel && (
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <span>
                    {t("matchCard.matchday")} {journeeLabel}
                  </span>
                </div>
              )}
              {saisonLabel && <span className="shrink-0">{saisonLabel}</span>}
            </div>
            
            {/* Ligne 2: Badges et actions */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {match.date && <LiveMatchBadge matchDate={match.date} />}
                <VotedBadge matchId={match.id} />
                <MatchCredibility matchId={match.id} />
              </div>
              {/* Bouton de partage - visible seulement si déjà voté */}
              <MatchDetailBadges
                match={match as unknown as MatchType}
                criteresDefs={criteresDefinitions} 
                shareBranding={null}
                locale={locale}
              />
            </div>
          </div>

          {/* Équipes et score */}
          <div className="mb-3 sm:mb-6 w-full">
            {/* Layout mobile: vertical, desktop: horizontal */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full">
              {/* Équipe domicile */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 w-full sm:w-auto sm:flex-1">
                {match.equipe_home.logo_url ? (
                  <div className="relative w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 shrink-0">
                    <Image
                      src={match.equipe_home.logo_url}
                      alt={`Logo ${homeName}`}
                      fill
                      sizes="(max-width: 640px) 40px, (max-width: 768px) 56px, 64px"
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 shrink-0 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <span className="text-gray-400 dark:text-gray-400 font-bold text-xs sm:text-base md:text-lg">
                      {(match.equipe_home.abbr || homeName).charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="font-bold text-sm sm:text-lg md:text-xl text-gray-900 dark:text-white break-words">{homeName}</div>
                  {homeCity && <div className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 break-words">{homeCity}</div>}
                </div>
              </div>

              {/* Score - Centré sur mobile, entre les équipes sur desktop */}
              <div className="mx-auto sm:mx-4 shrink-0 self-center">
                {typeof match.score_home === "number" && typeof match.score_away === "number" ? (
                  <div className="text-center">
                    <div className={`text-xl sm:text-3xl md:text-4xl font-bold mb-0.5 sm:mb-1 ${isMatchLive ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
                      {match.score_home} - {match.score_away}
                    </div>
                    <div className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t("matchCard.score")}</div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-400 dark:text-gray-500 mb-0.5 sm:mb-1">VS</div>
                    <div className="text-[10px] sm:text-sm text-gray-400 dark:text-gray-500">{t("common.datePending")}</div>
                  </div>
                )}
              </div>

              {/* Équipe extérieure */}
              <div className="flex items-center gap-2 sm:gap-3 justify-start sm:justify-end text-left sm:text-right min-w-0 w-full sm:w-auto sm:flex-1 sm:flex-row-reverse">
                <div className="flex-1 min-w-0 overflow-hidden text-left sm:text-right">
                  <div className="font-bold text-sm sm:text-lg md:text-xl text-gray-900 dark:text-white break-words">{awayName}</div>
                  {awayCity && <div className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 break-words">{awayCity}</div>}
                </div>
                {match.equipe_away.logo_url ? (
                  <div className="relative w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 shrink-0">
                    <Image
                      src={match.equipe_away.logo_url}
                      alt={`Logo ${awayName}`}
                      fill
                      sizes="(max-width: 640px) 40px, (max-width: 768px) 56px, 64px"
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 shrink-0 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <span className="text-gray-400 dark:text-gray-400 font-bold text-xs sm:text-base md:text-lg">
                      {(match.equipe_away.abbr || awayName).charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer avec stade et arbitre */}
          <div className="pt-2 sm:pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 w-full">
            <div className="flex-1 flex items-center gap-1.5 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400 min-w-0 w-full sm:w-auto">
              {match.equipe_home.stadium && (
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                  <span className="truncate break-words">{match.equipe_home.stadium}</span>
                </div>
              )}
            </div>
            {arbitre && typeof arbitre === "object" && refereeName && (
              <div className="shrink-0 w-full sm:w-auto">
                <ArbitreLink arbitreId={arbitre.id} photoUrl={arbitre.photo_url || null} name={refereeName} category={refereeCategory || null} />
              </div>
            )}
          </div>
        </div>
      </div>

      {arbitre && typeof arbitre === "object" && canVote && (
        <VoteSectionWrapper
          matchId={match.id}
          arbitreId={arbitre.id}
          arbitreNom={refereeName ?? arbitre.nom}
          criteresDefs={criteresDefinitions}
          matchStatus={match.status}
          actualStartedAt={actualStartedAtISO}
        />
      )}

      {(!arbitre || typeof arbitre !== "object") && (
        <AlertBanner variant="warning" message={t("matchDetail.noReferee")} className="mb-4 sm:mb-6" />
      )}

      {arbitre && typeof arbitre === "object" && !canVote && (() => {
        let reasonMessage = t("matchDetail.cannotVote");

        if (match.status === "CANCELLED") {
          reasonMessage = t("matchDetail.matchCancelled") || "Ce match a été annulé, le vote n'est pas possible.";
        } else if (match.status === "UPCOMING" || !match.status) {
          reasonMessage = t("matchDetail.matchNotStarted") || "Le match n'a pas encore commencé.";
        } else if (actualStartedAtISO) {
          const startedAt = new Date(actualStartedAtISO);
          const now = new Date();
          const diffMs = now.getTime() - startedAt.getTime();
          const diffMinutes = Math.floor(diffMs / (1000 * 60));
          if (diffMinutes < 30) {
            const remainingMinutes = 30 - diffMinutes;
            reasonMessage =
              t("matchDetail.waitToVote", { minutes: remainingMinutes }) ||
              `Veuillez attendre encore ${remainingMinutes} minute(s) avant de pouvoir voter.`;
          }
        }

        return <AlertBanner variant="warning" message={reasonMessage} className="mb-4 sm:mb-6" />;
      })()}
      </div>
    </>
  );
}
