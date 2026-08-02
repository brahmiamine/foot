import Link from "next/link";
import Image from "next/image";
import { Match } from "@/types";
import { isNextImageSafe } from "@/lib/imageHost";
import { TFunction } from "./types";

interface MatchCardTeamsProps {
  t: TFunction;
  match: Match;
  homeName: string;
  awayName: string;
  hasScore: boolean;
  isMatchLive: unknown;
}

export function MatchCardTeams({ t, match, homeName, awayName, hasScore, isMatchLive }: MatchCardTeamsProps) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-0">
      {/* Équipe domicile */}
      <div className="flex flex-1 flex-col items-center text-center gap-1 min-w-0">
        {match.equipe_home.logo_url && isNextImageSafe(match.equipe_home.logo_url) ? (
          <div className="relative w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
            <Image
              src={match.equipe_home.logo_url}
              alt={homeName}
              fill
              sizes="(max-width: 640px) 40px, 48px"
              className="object-contain"
            />
          </div>
        ) : match.equipe_home.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={match.equipe_home.logo_url}
            alt={homeName}
            className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 object-contain"
          />
        ) : (
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400 flex-shrink-0">
            {match.equipe_home.nom
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
        )}
        <Link
          href={`/teams/${match.equipe_home.id}`}
          onClick={(e) => {
            e.stopPropagation()
          }}
          className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white leading-tight break-words line-clamp-2 w-full px-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          {homeName}
        </Link>
      </div>
      {/* Score au centre */}
      <div className="flex min-w-[60px] sm:min-w-[80px] flex-col items-center justify-center text-center flex-shrink-0">
        {hasScore ? (
          <>
            <p
              className={`text-base sm:text-lg font-bold ${isMatchLive ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}
            >
              {match.score_home} - {match.score_away}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap mt-0.5">{t("common.finished")}</p>
          </>
        ) : (
          <>
            <p className="text-base sm:text-lg font-bold text-gray-400 dark:text-gray-500">VS</p>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap mt-0.5">{t("common.upcoming")}</p>
          </>
        )}
      </div>
      {/* Équipe extérieure */}
      <div className="flex flex-1 flex-col items-center text-center gap-1 min-w-0">
        {match.equipe_away.logo_url && isNextImageSafe(match.equipe_away.logo_url) ? (
          <div className="relative w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
            <Image
              src={match.equipe_away.logo_url}
              alt={awayName}
              fill
              sizes="(max-width: 640px) 40px, 48px"
              className="object-contain"
            />
          </div>
        ) : match.equipe_away.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={match.equipe_away.logo_url}
            alt={awayName}
            className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 object-contain"
          />
        ) : (
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400 flex-shrink-0">
            {match.equipe_away.nom
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
        )}
        <Link
          href={`/teams/${match.equipe_away.id}`}
          onClick={(e) => {
            e.stopPropagation()
          }}
          className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white leading-tight break-words line-clamp-2 w-full px-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          {awayName}
        </Link>
      </div>
    </div>
  );
}
