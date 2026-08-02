import Image from "next/image";
import { getLocalizedName } from "@/lib/utils";
import { Match } from "@/types";

export function TeamDisplay({ team, align = "start", locale }: { team: Match["equipe_home"]; align?: "start" | "end"; locale: string }) {
  const alignmentClasses = align === "end" ? "text-right flex-row-reverse sm:flex-row sm:text-right" : "text-left flex-row";
  const displayName = getLocalizedName(locale, {
    defaultValue: team.nom,
    fr: team.nom,
    en: team.nom_en ?? team.nom,
    ar: team.nom_ar ?? team.nom,
  });
  return (
    <div className={`flex items-center gap-2 sm:gap-3 ${alignmentClasses} min-w-0 w-full`}>
      {team.logo_url ? (
        <div className="relative w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
          <Image src={team.logo_url} alt={`Logo ${displayName}`} fill sizes="(max-width: 640px) 40px, 48px" className="object-contain" />
        </div>
      ) : (
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400 flex-shrink-0">
          {team.nom
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>
      )}
      <span className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base break-words line-clamp-2 min-w-0 flex-1">{displayName}</span>
    </div>
  );
}
