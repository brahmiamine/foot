import Link from "next/link";
import Image from "next/image";
import { formatDate, formatDateShort, getLocalizedName } from "@/lib/utils";
import { Match } from "@/types";
import { getServerLocale, translate } from "@/lib/i18nServer";
import VotedBadge from "./VotedBadge";
import ArbitreLink from "./ArbitreLink";
import LiveMatchBadge from "./LiveMatchBadge";
import CredibilityBadge from "./CredibilityBadge";
import { getMatchCredibility } from "@/lib/matchCredibility";

interface MatchCardProps {
  match: Match;
}

export default async function MatchCard({ match }: MatchCardProps) {
  const locale = await getServerLocale();
  const t = (key: string, params?: Record<string, string | number>) => translate(key, locale, params);
  
  // Calculer la crédibilité du match
  const credibility = await getMatchCredibility(match.id);
  const dateLabel = match.date ? formatDate(match.date, locale) : t("common.datePending");
  const dateOnlyLabel = match.date ? formatDateShort(match.date, locale) : null;
  const journeeLabel = match.journee?.numero;
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
  const homeLabel = match.equipe_home.abbr || homeName;
  const awayLabel = match.equipe_away.abbr || awayName;
  const homeCity =
    match.equipe_home.city || match.equipe_home.city_ar || match.equipe_home.city_en
      ? getLocalizedName(locale, {
          defaultValue: match.equipe_home.city ?? match.equipe_home.city_en ?? match.equipe_home.city_ar ?? "",
          fr: match.equipe_home.city ?? undefined,
          en: match.equipe_home.city_en ?? undefined,
          ar: match.equipe_home.city_ar ?? undefined,
        })
      : null;
  const awayCity =
    match.equipe_away.city || match.equipe_away.city_ar || match.equipe_away.city_en
      ? getLocalizedName(locale, {
          defaultValue: match.equipe_away.city ?? match.equipe_away.city_en ?? match.equipe_away.city_ar ?? "",
          fr: match.equipe_away.city ?? undefined,
          en: match.equipe_away.city_en ?? undefined,
          ar: match.equipe_away.city_ar ?? undefined,
        })
      : null;
  const refereeName = match.arbitre
    ? getLocalizedName(locale, {
        defaultValue: match.arbitre.nom,
        fr: match.arbitre.nom,
        en: match.arbitre.nom_en ?? undefined,
        ar: match.arbitre.nom_ar ?? undefined,
      })
    : null;
  const refereeCategory =
    match.arbitre && (match.arbitre.categorie || match.arbitre.categorie_ar)
      ? getLocalizedName(locale, {
          defaultValue: match.arbitre.categorie ?? match.arbitre.categorie_ar ?? "",
          fr: match.arbitre.categorie ?? undefined,
          ar: match.arbitre.categorie_ar ?? undefined,
        })
      : null;

  const hasScore = typeof match.score_home === "number" && typeof match.score_away === "number";

  // Vérifier si le match est en cours pour mettre le score en rouge
  const isMatchLive =
    match.date &&
    (() => {
      try {
        const matchDate = typeof match.date === "string" ? new Date(match.date) : match.date;
        const now = new Date();
        if (matchDate > now) return false;
        const diffMs = now.getTime() - matchDate.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return diffMinutes >= 0 && diffMinutes <= 105; // Match en cours si moins de 105 min
      } catch {
        return false;
      }
    })();

  return (
    <div className="block rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border overflow-hidden group w-full bg-white border-gray-200 text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
      <Link href={`/matches/${match.id}`} className="block">
        <div className="p-3 sm:p-6">
          {/* Header avec date et journée */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-gray-100 dark:border-gray-700 gap-2">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span>{dateLabel}</span>
              </div>
              {journeeLabel && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              <VotedBadge matchId={match.id} />
              <LiveMatchBadge matchDate={match.date} />
              {credibility !== null && credibility < 100 && (
                <CredibilityBadge credibility={credibility} size="sm" showLabel={false} />
              )}
            </div>
            <div className="hidden sm:block text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          {/* Équipes et score */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-4">
            {/* Équipe domicile */}
            <div className="flex-1 flex items-center gap-2 sm:gap-4 min-w-0">
              {match.equipe_home.logo_url ? (
                <div className="relative w-12 h-12 sm:w-16 sm:h-16 shrink-0">
                  <Image
                    src={match.equipe_home.logo_url}
                    alt={`Logo ${homeName}`}
                    fill
                    sizes="(max-width: 640px) 48px, 64px"
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 sm:w-16 sm:h-16 shrink-0 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <span className="text-gray-400 dark:text-gray-400 font-bold text-sm sm:text-lg">{homeLabel.charAt(0).toUpperCase()}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/teams/${match.equipe_home.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-bold text-base sm:text-xl text-gray-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors block"
                >
                  {homeName}
                </Link>
                {homeCity && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{homeCity}</div>}
              </div>
            </div>

            {/* Score */}
            <div className="mx-0 sm:mx-6 shrink-0 self-center">
              {hasScore ? (
                <div className="text-center">
                  <div
                    className={`text-2xl sm:text-3xl font-bold mb-1 ${
                      isMatchLive ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {match.score_home} - {match.score_away}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t("matchCard.score")}</div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-gray-400 dark:text-gray-500 mb-1">VS</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">{t("common.datePending")}</div>
                </div>
              )}
            </div>

            {/* Équipe extérieure */}
            <div className="flex-1 flex items-center gap-2 sm:gap-4 justify-end text-right min-w-0 sm:flex-row-reverse">
              <div className="flex-1 min-w-0">
                <Link
                  href={`/teams/${match.equipe_away.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-bold text-base sm:text-xl text-gray-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors block"
                >
                  {awayName}
                </Link>
                {awayCity && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{awayCity}</div>}
              </div>
              {match.equipe_away.logo_url ? (
                <div className="relative w-12 h-12 sm:w-16 sm:h-16 shrink-0">
                  <Image
                    src={match.equipe_away.logo_url}
                    alt={`Logo ${awayName}`}
                    fill
                    sizes="(max-width: 640px) 48px, 64px"
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 sm:w-16 sm:h-16 shrink-0 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <span className="text-gray-400 dark:text-gray-400 font-bold text-sm sm:text-lg">{awayLabel.charAt(0).toUpperCase()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer avec stade */}
          <div className="pt-3 sm:pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400 min-w-0">
              {match.equipe_home.stadium && (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                  <span className="truncate">{match.equipe_home.stadium}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>

      {/* Arbitre en dehors du Link principal */}
      {match.arbitre && refereeName && (
        <div className="px-3 sm:px-6 pb-3 sm:pb-6">
          <ArbitreLink
            arbitreId={match.arbitre.id}
            photoUrl={match.arbitre.photo_url || null}
            name={refereeName}
            category={refereeCategory || null}
          />
        </div>
      )}
    </div>
  );
}
