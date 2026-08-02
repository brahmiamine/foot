import Image from "next/image";
import { RankingEntry } from "@/lib/rankings";
import { CritereDefinition } from "@/types";
import { getLocalizedName } from "@/lib/utils";

interface RankingTableProps {
  entries: RankingEntry[];
  criteres: CritereDefinition[];
  locale: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export default function RankingTable({ entries, criteres, locale, t }: RankingTableProps) {
  if (!entries.length) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
        <p className="text-gray-600 dark:text-gray-400">{t("classement.noVotes")}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-2 sm:mx-0">
      <table className="min-w-full text-xs sm:text-sm rtl:text-right">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left sticky left-0 bg-gray-100 dark:bg-gray-800 z-10">{t("classement.rank")}</th>
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">{t("classement.referee")}</th>
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">{t("classement.globalNote")}</th>
            {criteres.map((critere) => (
              <th key={critere.id} className="px-2 sm:px-4 py-2 sm:py-3 text-left hidden sm:table-cell">
                <span className="whitespace-nowrap">
                  {getLocalizedName(locale, {
                    defaultValue: critere.label_fr,
                    fr: critere.label_fr,
                    en: critere.label_en ?? undefined,
                    ar: critere.label_ar,
                  })}
                </span>
              </th>
            ))}
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">{t("classement.votesCount")}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => {
            const displayName = getLocalizedName(locale, {
              defaultValue: entry.nom,
              fr: entry.nom,
              en: entry.nom_en ?? undefined,
              ar: entry.nom_ar ?? undefined,
            });

            return (
              <tr
                key={entry.arbitreId}
                className={`border-b border-gray-100 dark:border-gray-700 ${
                  index % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-900"
                }`}
              >
                <td className="px-2 sm:px-4 py-2 sm:py-3 font-semibold text-blue-700 dark:text-blue-400 sticky left-0 bg-inherit z-10">
                  {index + 1}
                </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 min-w-[120px]">
                  <div className="flex items-center gap-2 sm:gap-3">
                    {entry.photo_url && (
                      <span className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 shrink-0">
                        <Image
                          src={entry.photo_url}
                          alt={`Photo ${displayName}`}
                          fill
                          sizes="(max-width: 640px) 32px, 40px"
                          className="object-cover"
                        />
                      </span>
                    )}
                    <span className="font-medium text-gray-900 dark:text-white text-xs sm:text-sm truncate">{displayName}</span>
                  </div>
                </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 font-semibold text-blue-700 dark:text-blue-400">{entry.moyenne.toFixed(2)}</td>
                {criteres.map((critere) => {
                  const value = entry.criteres?.[critere.id] ?? null;
                  return (
                    <td
                      key={`${entry.arbitreId}-${critere.id}`}
                      className="px-2 sm:px-4 py-2 sm:py-3 hidden sm:table-cell text-gray-700 dark:text-gray-300"
                    >
                      {typeof value === "number" ? value.toFixed(2) : "—"}
                    </td>
                  );
                })}
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600 dark:text-gray-400">{entry.votes}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
