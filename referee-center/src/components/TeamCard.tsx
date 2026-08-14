import Link from "next/link";
import Image from "next/image";
import { getLocalizedName } from "@/lib/utils";
import { getServerLocale } from "@/lib/i18nServer";
import { isNextImageSafe } from "@/lib/imageHost";
import type { Team } from "@/types";

interface TeamCardProps {
  team: Team;
}

export default async function TeamCard({ team }: TeamCardProps) {
  const locale = await getServerLocale();
  const displayName = getLocalizedName(locale, {
    defaultValue: team.nom,
    fr: team.nom,
    en: team.nom_en ?? undefined,
    ar: team.nom_ar ?? undefined,
  });
  const displayCity = getLocalizedName(locale, {
    defaultValue: team.city ?? team.city_en ?? team.city_ar ?? "",
    fr: team.city ?? undefined,
    en: team.city_en ?? undefined,
    ar: team.city_ar ?? undefined,
  });

  return (
    <Link
      href={`/teams/${team.id}`}
      className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
    >
      {team.logo_url && isNextImageSafe(team.logo_url) ? (
        <div className="relative w-14 h-14 flex-shrink-0">
          <Image src={team.logo_url} alt={`Logo ${displayName}`} fill sizes="56px" className="object-contain" />
        </div>
      ) : team.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={team.logo_url}
          alt={`Logo ${displayName}`}
          className="w-14 h-14 flex-shrink-0 object-contain"
        />
      ) : (
        <div className="w-14 h-14 flex-shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex items-center justify-center font-semibold border border-blue-200 dark:border-blue-800">
          {(team.abbr || displayName).slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate">{displayName}</h3>
        {displayCity && <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{displayCity}</p>}
      </div>
    </Link>
  );
}
