import Link from "next/link";
import Image from "next/image";
import { MouseEvent } from "react";
import { Match } from "@/types";
import { TFunction } from "./types";

interface MatchCardRefereeProps {
  t: TFunction;
  arbitre: Match["arbitre"];
  refereeName: string | null;
  refereeCategory: string | null;
  stopPropagation: (event: MouseEvent) => void;
  onOpenPreview: () => void;
}

export function MatchCardReferee({ t, arbitre, refereeName, refereeCategory, stopPropagation, onOpenPreview }: MatchCardRefereeProps) {
  return (
    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 sm:mt-3 flex flex-col gap-2">
      <span className="uppercase tracking-wide text-[11px] text-gray-400 dark:text-gray-500">{t("common.referee")}</span>
      {arbitre ? (
        <div className="flex items-center gap-3">
          {arbitre.photo_url ? (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onOpenPreview();
              }}
              className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700 flex-shrink-0 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
              aria-label={t("matchDetail.refereeInfo")}
            >
              <Image src={arbitre.photo_url} alt={arbitre.nom} fill sizes="48px" className="object-cover" />
            </button>
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-semibold text-gray-600 dark:text-gray-300 flex-shrink-0">
              {(arbitre.nom || refereeName || "AR")
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
          )}
          <div className="flex flex-col">
            <Link
              href={`/arbitres/${arbitre.id}`}
              onClick={stopPropagation}
              className="text-base font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              {refereeName ?? arbitre.nom}
            </Link>
            {refereeCategory && <span className="text-xs text-gray-500 dark:text-gray-400">{refereeCategory}</span>}
          </div>
        </div>
      ) : (
        <span className="font-medium text-gray-700 dark:text-gray-300">{t("common.noRefereeAssigned")}</span>
      )}
    </div>
  );
}
