"use client";

import StarsRating from "../StarsRating";
import { CritereDefinition } from "@/types";
import type { Locale } from "@/lib/i18n";
import type { CriteresState } from "./types";

interface CriteriaGroupProps {
  categorie: string;
  list: CritereDefinition[];
  criteres: CriteresState;
  setCriteres: React.Dispatch<React.SetStateAction<CriteresState>>;
  locale: Locale;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export default function CriteriaGroup({ categorie, list, criteres, setCriteres, locale, t }: CriteriaGroupProps) {
  const sectionLabel =
    categorie === "assistant"
      ? t("voteForm.section.assistant")
      : categorie === "var"
      ? t("voteForm.section.var")
      : t("voteForm.section.arbitre");

  return (
    <div className="space-y-3 sm:space-y-4">
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">{sectionLabel}</h3>
      {list.map((critere) => {
        const label = locale === "ar" ? critere.label_ar : locale === "en" ? critere.label_en ?? critere.label_fr : critere.label_fr;
        const description = locale === "ar" ? critere.description_ar : critere.description_fr;

        return (
          <div key={critere.id} className="p-3 sm:p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200">{label}</label>
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">{critere.categorie}</span>
            </div>
            {description && <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 sm:mb-3">{description}</p>}
            <StarsRating
              value={criteres[critere.id]}
              onChange={(value) =>
                setCriteres((prev) => ({
                  ...prev,
                  [critere.id]: value,
                }))
              }
            />
          </div>
        );
      })}
    </div>
  );
}
