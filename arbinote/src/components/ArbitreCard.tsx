import Link from "next/link";
import Image from "next/image";
import { formatNote, getLocalizedName } from "@/lib/utils";
import { getServerLocale, translate } from "@/lib/i18nServer";
import type { Arbitre as ArbitreType } from "@/types";

interface ArbitreCardProps {
  arbitre: ArbitreType;
  rank?: number;
}

export default async function ArbitreCard({ arbitre, rank }: ArbitreCardProps) {
  const locale = await getServerLocale();
  const t = (key: string, params?: Record<string, string | number>) => translate(key, locale, params);
  const displayNote = arbitre.moyenne_note ? formatNote(arbitre.moyenne_note) : "N/A";
  const displayName = getLocalizedName(locale, {
    defaultValue: arbitre.nom,
    fr: arbitre.nom,
    en: arbitre.nom_en ?? undefined,
    ar: arbitre.nom_ar ?? undefined,
  });
  const displayCategory =
    arbitre.categorie || arbitre.categorie_ar
      ? getLocalizedName(locale, {
          defaultValue: arbitre.categorie ?? arbitre.categorie_ar ?? "",
          fr: arbitre.categorie ?? undefined,
          ar: arbitre.categorie_ar ?? undefined,
        })
      : null;
  const displayNationality =
    arbitre.nationalite || arbitre.nationalite_ar
      ? getLocalizedName(locale, {
          defaultValue: arbitre.nationalite ?? arbitre.nationalite_ar ?? "",
          fr: arbitre.nationalite ?? undefined,
          ar: arbitre.nationalite_ar ?? undefined,
        })
      : null;

  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link
      href={`/arbitres/${arbitre.id}`}
      className="block p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex-shrink-0">
            {arbitre.photo_url ? (
              <div className="relative w-16 h-16 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700">
                <Image src={arbitre.photo_url} alt={`Photo ${displayName}`} fill sizes="64px" className="object-cover" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex items-center justify-center font-semibold border border-blue-200 dark:border-blue-800">
                {initials}
              </div>
            )}
          </div>
          {rank !== undefined && (
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
              {rank}
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">{displayName}</h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              {displayCategory && (
                <span className="inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded text-xs mr-2">
                  {displayCategory}
                </span>
              )}
              {displayNationality && <span className="text-gray-500 dark:text-gray-400">🇹🇳 {displayNationality}</span>}
            </div>
          </div>
        </div>
        <div className="text-right ml-4">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {displayNote}
            {arbitre.moyenne_note && <span className="text-sm">/5</span>}
          </div>
          {arbitre.nombre_votes !== undefined && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {arbitre.nombre_votes} {arbitre.nombre_votes > 1 ? t("common.votes") : t("common.vote")}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
