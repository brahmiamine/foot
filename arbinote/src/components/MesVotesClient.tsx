"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import MatchCardClient from "./MatchCardClient";
import MesVotesPageSkeleton from "./MesVotesPageSkeleton";
import { useTranslations } from "@/lib/i18n";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { Match, Vote, CritereDefinition, CritereCategory } from "@/types";
import { formatDateOnly, getJourneeDisplayName, getLocalizedName } from "@/lib/utils";
import { defaultCritereDefinitions } from "@/lib/defaultCriteres";
import { ShareBrandingInfo } from "./MatchShareCard";
import type { Federation, League } from "@/lib/entities";

interface VoteWithMatch extends Vote {
  match?: Match & {
    journee?: {
      id: string;
      numero: number;
      date_journee?: string | null;
      saison?: {
        id: string;
        nom: string;
        league_id?: string | null;
      };
    };
  };
}

type MatchWithJourneeSaison = NonNullable<VoteWithMatch["match"]>;

type CategoryKey = CritereCategory;

interface VoteEntry {
  vote: VoteWithMatch;
  match: MatchWithJourneeSaison;
  categories: Record<CategoryKey, number | null>;
}

interface MesVotesClientProps {
  criteresDefs?: CritereDefinition[];
}

export default function MesVotesClient({ criteresDefs = [] }: MesVotesClientProps) {
  const { t, locale } = useTranslations();
  const criteresList = criteresDefs.length ? criteresDefs : defaultCritereDefinitions;
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [votes, setVotes] = useState<VoteWithMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [federationsWithLeagues, setFederationsWithLeagues] = useState<Array<Federation & { leagues: League[] }>>([]);

  const critereCategoryMap = useMemo(() => {
    const map = new Map<string, CategoryKey>();
    criteresList.forEach((critere) => {
      map.set(critere.id, critere.categorie as CategoryKey);
    });
    return map;
  }, [criteresList]);

  const computeCategoryAverages = useCallback((vote: VoteWithMatch): Record<CategoryKey, number | null> => {
    const buckets: Record<CategoryKey, { total: number; count: number }> = {
      arbitre: { total: 0, count: 0 },
      var: { total: 0, count: 0 },
      assistant: { total: 0, count: 0 },
    };

    if (vote.criteres && typeof vote.criteres === "object") {
      Object.entries(vote.criteres).forEach(([critereId, rawValue]) => {
        const category = critereCategoryMap.get(critereId) ?? "arbitre";
        const numericValue = typeof rawValue === "number" ? rawValue : parseFloat(String(rawValue));
        if (!Number.isFinite(numericValue) || numericValue <= 0) {
          return;
        }
        buckets[category].total += numericValue;
        buckets[category].count += 1;
      });
    }

    return {
      arbitre: buckets.arbitre.count ? buckets.arbitre.total / buckets.arbitre.count : null,
      var: buckets.var.count ? buckets.var.total / buckets.var.count : null,
      assistant: buckets.assistant.count ? buckets.assistant.total / buckets.assistant.count : null,
    };
  }, [critereCategoryMap]);

  const categoryLabelKeys: Record<CategoryKey, string> = {
    arbitre: "myVotes.refereeVote",
    var: "myVotes.varVote",
    assistant: "myVotes.assistantVote",
  };

  const categoryStyles: Record<CategoryKey, { border: string; text: string }> = {
    arbitre: {
      border: "border-blue-100 dark:border-blue-900/40",
      text: "text-blue-600 dark:text-blue-400",
    },
    var: {
      border: "border-purple-100 dark:border-purple-900/40",
      text: "text-purple-600 dark:text-purple-400",
    },
    assistant: {
      border: "border-emerald-100 dark:border-emerald-900/40",
      text: "text-emerald-600 dark:text-emerald-400",
    },
  };

  const categoryOrder: CategoryKey[] = ["arbitre", "var", "assistant"];

  // Récupérer le fingerprint
  useEffect(() => {
    FingerprintJS.load()
      .then((fp) => fp.get())
      .then((result) => {
        setFingerprint(result.visitorId);
      })
      .catch(() => {
        setFingerprint(null);
      });
  }, []);

  // Récupérer les fédérations et ligues pour le branding
  useEffect(() => {
    const fetchFederations = async () => {
      try {
        const response = await fetch('/api/federations');
        if (response.ok) {
          const data = await response.json();
          setFederationsWithLeagues(data);
        }
      } catch (error) {
        console.error("Error fetching federations:", error);
      }
    };
    fetchFederations();
  }, []);

  // Fonction pour obtenir le branding d'un match
  const getMatchBranding = useCallback((match: MatchWithJourneeSaison): ShareBrandingInfo | null => {
    const journee = match.journee;
    if (!journee?.saison?.league_id || federationsWithLeagues.length === 0) {
      return null;
    }
    const leagueId = journee.saison.league_id;
    for (const fed of federationsWithLeagues) {
      const league = fed.leagues?.find((l) => l.id === leagueId);
      if (league) {
        return {
          leagueName: getLocalizedName(locale, {
            defaultValue: league.nom,
            fr: league.nom,
            en: league.nom_en ?? league.nom,
            ar: league.nom_ar ?? league.nom,
          }),
          leagueLogoUrl: league.logo_url || null,
          federationName: getLocalizedName(locale, {
            defaultValue: fed.nom,
            fr: fed.nom,
            en: fed.nom_en ?? fed.nom,
            ar: fed.nom_ar ?? fed.nom,
          }),
          federationLogoUrl: fed.logo_url || null,
        };
      }
    }
    return null;
  }, [federationsWithLeagues, locale]);

  // Récupérer les votes de l'utilisateur
  useEffect(() => {
    if (!fingerprint) return;

    const fetchVotes = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/votes/user/${fingerprint}`);
        if (response.ok) {
          const data = await response.json();
          setVotes(data);
        } else {
          console.error("Failed to fetch votes");
        }
      } catch (error) {
        console.error("Error fetching votes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVotes();
  }, [fingerprint]);

  // Grouper les votes par journée
  const votesByJournee = useMemo(() => {
    const grouped = new Map<string, VoteWithMatch[]>();

    votes.forEach((vote) => {
      if (!vote.match?.journee || !vote.match) return;

      const journeeId = vote.match.journee.id;
      const journeeNumero = vote.match.journee.numero;

      const key = `${journeeId}-${journeeNumero}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(vote);
    });

    // Convertir en tableau et trier par date de journée (plus récentes en premier)
    return Array.from(grouped.entries())
      .map(([key, journeeVotes]) => {
        const firstVote = journeeVotes[0];
        const journee = firstVote.match?.journee;
        return {
          key,
          journeeId: journee?.id || "",
          journee: journee,
          journeeNumero: journee?.numero || 0, // Gardé pour le tri
          journeeDate: journee?.date_journee || null,
          saisonNom: journee?.saison?.nom || "",
          votes: journeeVotes.reduce<VoteEntry[]>((acc, vote) => {
            if (!vote.match) {
              return acc;
            }
            acc.push({
              vote,
              match: vote.match,
              categories: computeCategoryAverages(vote),
            });
            return acc;
          }, []),
        };
      })
      .sort((a, b) => {
        if (a.journeeDate && b.journeeDate) {
          return new Date(b.journeeDate).getTime() - new Date(a.journeeDate).getTime();
        }
        if (a.journeeDate) return -1;
        if (b.journeeDate) return 1;
        return b.journeeNumero - a.journeeNumero;
      });
  }, [votes, computeCategoryAverages]);

  if (loading) {
    return <MesVotesPageSkeleton />;
  }

  if (!fingerprint) {
    return (
      <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-10">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-gray-900 dark:text-white">{t("myVotes.title")}</h1>
        <p className="text-gray-600 dark:text-gray-400">{t("myVotes.noFingerprint")}</p>
      </div>
    );
  }

  if (votesByJournee.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-10">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-gray-900 dark:text-white">{t("myVotes.title")}</h1>
        <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
          <p className="text-gray-600 dark:text-gray-400">{t("myVotes.noVotes")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-10 space-y-6 sm:space-y-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{t("myVotes.title")}</h1>

      {votesByJournee.map((group) => (
        <div key={group.key} className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 dark:border-gray-700 pb-2 gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                {group.journee ? getJourneeDisplayName(group.journee, locale) : `${t("common.matchday")} ${group.journeeNumero}`}
              </h2>

              {group.journeeDate && (
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{formatDateOnly(group.journeeDate, locale)}</p>
              )}
            </div>
            <Link
              href={`/journees/${group.journeeId}`}
              className="text-blue-600 dark:text-blue-400 text-xs sm:text-sm font-medium hover:underline flex-shrink-0"
            >
              {t("journees.viewDetails")}
            </Link>
          </div>

          <div className="space-y-4">
            {group.votes.map((entry) => (
              <MatchCardClient
                key={entry.vote.id}
                match={entry.match}
                criteresDefs={criteresList}
                shareBranding={getMatchBranding(entry.match)}
                extraContent={
                  <div className="flex flex-wrap gap-2">
                    {categoryOrder.map((category) => {
                      const value = entry.categories[category];
                      return (
                        <div
                          key={`${entry.vote.id}-${category}`}
                          className="flex items-center gap-1 rounded-full bg-slate-100/90 dark:bg-gray-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-gray-200"
                        >
                          <span className="uppercase text-[9px] tracking-wide text-gray-500 dark:text-gray-400">
                            {t(categoryLabelKeys[category])}
                          </span>
                          <span className={categoryStyles[category].text}>
                            {typeof value === "number" ? `${value.toFixed(1)}/5` : "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                }
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
