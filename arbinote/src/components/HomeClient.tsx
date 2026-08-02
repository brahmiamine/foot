"use client";

import { useEffect, useMemo, useState, ChangeEvent } from "react";
import { useTranslations } from "@/lib/i18n";
import { Match, CritereDefinition } from "@/types";
import { formatDateOnly, getLocalizedName, getJourneeDisplayName } from "@/lib/utils";
import MatchCardClient from "./MatchCardClient";
import MatchCardSkeleton from "./MatchCardSkeleton";
import HomePageSkeleton from "./HomePageSkeleton";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { ShareBrandingInfo } from "./MatchShareCard";

interface JourneeWithMatches {
  id: string;
  numero: number | null;
  nom_fr?: string | null;
  nom_en?: string | null;
  nom_ar?: string | null;
  date_journee?: string | null;
  dateLabel?: string | null;
  matches: (Match & { credibility?: number | null; totalVotes?: number })[];
}

interface HomeClientProps {
  journees: JourneeWithMatches[];
  defaultJourneeId: string | null;
  criteresDefs: CritereDefinition[];
  shareContext?: ShareBrandingInfo | null;
  isLoading?: boolean;
}

export default function HomeClient({
  journees,
  defaultJourneeId,
  criteresDefs,
  shareContext,
  isLoading = false,
}: HomeClientProps) {
  const { t, locale } = useTranslations();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const journeeIdFromUrl = searchParams.get("journeeId");

  const dropdownJournees = useMemo(() => {
    return [...journees].sort((a, b) => {
      // Priorité 1: Trier par numero (ordre croissant : 1, 2, 3... 15, 31)
      if (a.numero !== null && b.numero !== null) {
        return a.numero - b.numero;
      }
      if (a.numero !== null) return -1;
      if (b.numero !== null) return 1;
      // Priorité 2: Trier par date_journee (plus anciennes en premier)
      if (a.date_journee && b.date_journee) {
        return new Date(a.date_journee).getTime() - new Date(b.date_journee).getTime();
      }
      if (a.date_journee) return -1;
      if (b.date_journee) return 1;
      // Priorité 3: Trier par nom_fr (ordre alphabétique)
      const aNom = a.nom_fr ?? "";
      const bNom = b.nom_fr ?? "";
      return aNom.localeCompare(bNom);
    });
  }, [journees]);

  const resolveJourneeId = () => {
    const fromUrl = journeeIdFromUrl && dropdownJournees.some((j) => j.id === journeeIdFromUrl) ? journeeIdFromUrl : null;
    if (fromUrl) return fromUrl;
    const fromDefault = defaultJourneeId && dropdownJournees.some((j) => j.id === defaultJourneeId) ? defaultJourneeId : null;
    if (fromDefault) return fromDefault;
    return dropdownJournees[0]?.id ?? null;
  };

  const [selectedJourneeId, setSelectedJourneeId] = useState<string | null>(resolveJourneeId);
  const [isChangingJournee, setIsChangingJournee] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Gérer le chargement initial
  useEffect(() => {
    // Désactiver le chargement initial après un délai pour montrer le skeleton avec animation
    // On attend que les données soient prêtes OU un minimum de 800ms pour voir l'animation
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const nextId = resolveJourneeId();
    if (nextId !== selectedJourneeId) {
      setSelectedJourneeId(nextId);
      setIsChangingJournee(false);
    }
  }, [journeeIdFromUrl, defaultJourneeId, dropdownJournees, selectedJourneeId]);

  const selectedJournee = useMemo(() => {
    if (!selectedJourneeId) return null;
    return dropdownJournees.find((journee) => journee.id === selectedJourneeId) ?? null;
  }, [dropdownJournees, selectedJourneeId]);

  const getJourneeLabel = (journee: JourneeWithMatches) => {
    return getJourneeDisplayName(journee, locale);
  };

  const handleJourneeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextId = event.target.value || null;
    setIsChangingJournee(true);
    setSelectedJourneeId(nextId);

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(searchParams.toString());
      if (nextId) {
        params.set("journeeId", nextId);
      } else {
        params.delete("journeeId");
      }
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      window.history.replaceState(null, "", newUrl);
    }

    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        setIsChangingJournee(false);
      }, 150);
    } else {
      setIsChangingJournee(false);
    }
  };

  const groupedMatches = useMemo(() => {
    if (!selectedJournee || selectedJournee.matches.length === 0) {
      return [];
    }

    const groups = new Map<
      string,
      {
        label: string | null;
        matches: Match[];
        sortValue: number;
      }
    >();

    selectedJournee.matches.forEach((match) => {
      const rawDate =
        match.date !== null && match.date !== undefined
          ? typeof match.date === "string"
            ? match.date
            : new Date(match.date).toISOString()
          : null;
      const label = rawDate ? formatDateOnly(rawDate, locale) : null;
      const sortValue = rawDate ? new Date(rawDate).getTime() : Number.MAX_SAFE_INTEGER;
      const key = label ?? "unknown";
      const existing = groups.get(key) ?? { label, matches: [], sortValue };
      existing.matches.push(match);
      existing.sortValue = Math.min(existing.sortValue, sortValue);
      groups.set(key, existing);
    });

    return Array.from(groups.values()).sort((a, b) => a.sortValue - b.sortValue);
  }, [locale, selectedJournee]);

  const renderVoteStats = (summary?: Match["voteSummary"] | null) => {
    if (!summary || summary.totalVotes === 0) return null;

    const metrics = [
      {
        key: "global",
        label: t("home.matchStats.global"),
        value: summary.globalAverage,
        text: "text-purple-600 dark:text-purple-400",
      },
      {
        key: "arbitre",
        label: t("home.matchStats.referee"),
        value: summary.arbitreAverage,
        text: "text-blue-600 dark:text-blue-400",
      },
      {
        key: "var",
        label: t("home.matchStats.var"),
        value: summary.varAverage,
        text: "text-indigo-600 dark:text-indigo-400",
      },
      {
        key: "assistant",
        label: t("home.matchStats.assistants"),
        value: summary.assistantAverage,
        text: "text-emerald-600 dark:text-emerald-400",
      },
    ];

    return (
      <div className="flex flex-wrap items-center gap-2">
        {metrics.map((metric) => (
          <div
            key={metric.key}
            className="flex items-center gap-1.5 rounded-full bg-slate-100/90 dark:bg-gray-800/80 px-3 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-gray-200"
          >
            <span className="uppercase text-[9px] tracking-wide text-gray-500 dark:text-gray-400">
              {metric.label}
            </span>
            <span className={metric.text}>
              {typeof metric.value === "number" ? `${metric.value.toFixed(1)}/5` : "—"}
            </span>
          </div>
        ))}
        <span className="ml-auto text-[11px] font-medium text-gray-500 dark:text-gray-400">
          {t("home.matchStats.voteCount", { count: summary.totalVotes })}
        </span>
      </div>
    );
  };

  return (
    <section className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">{t("matches.list.title")}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {selectedJournee ? getJourneeLabel(selectedJournee) : t("journees.title")}
            </h2>
            {selectedJournee && (
              <Link
                href={`/journees/${selectedJournee.id}`}
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                {t("journees.viewDetails")}
              </Link>
            )}
          </div>
          {selectedJournee?.dateLabel && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{selectedJournee.dateLabel}</p>
          )}
        </div>
        <div className="w-full sm:w-72">
          <label htmlFor="home-journee-select" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
            {t("journees.selectJournee")}
          </label>
          <select
            id="home-journee-select"
            value={selectedJourneeId ?? ""}
            onChange={handleJourneeChange}
            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-200 transition"
          >
            {dropdownJournees.map((journee) => {
              const dateOnly = journee.date_journee ? formatDateOnly(journee.date_journee, locale) : null;
              const label = getJourneeLabel(journee);
              return (
                <option key={journee.id} value={journee.id}>
                  {label}
                  {dateOnly ? ` - ${dateOnly}` : ""}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {isLoading || isInitialLoading ? (
        <HomePageSkeleton />
      ) : isChangingJournee ? (
        <div className="space-y-6 sm:space-y-8">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <MatchCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : !selectedJournee ? (
        <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-center">
          <p className="text-gray-600 dark:text-gray-300">{t("journees.noJourneeSelected")}</p>
        </div>
      ) : selectedJournee.matches.length === 0 ? (
        <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-center">
          <p className="text-gray-600 dark:text-gray-300">{t("journee.noMatches")}</p>
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {groupedMatches.map((group) => {
            const matchesSorted = [...group.matches].sort((a, b) => {
              if (!a.date && !b.date) return 0;
              if (!a.date) return 1;
              if (!b.date) return -1;
              const dateA = typeof a.date === "string" ? new Date(a.date) : a.date;
              const dateB = typeof b.date === "string" ? new Date(b.date) : b.date;
              return dateA.getTime() - dateB.getTime();
            });
            return (
              <div key={group.label ?? "unknown"} className="space-y-4">
                {group.label && (
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2">
                    {group.label}
                  </h3>
                )}
                <div className="space-y-4">
                  {matchesSorted.map((match) => (
                    <MatchCardClient
                      key={match.id}
                      match={match}
                      extraContent={renderVoteStats(match.voteSummary)}
                      criteresDefs={criteresDefs}
                      shareBranding={shareContext}
                      credibility={match.credibility}
                      totalVotes={match.totalVotes}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}


