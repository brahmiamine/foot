"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "@/lib/i18n";
import { CritereDefinition } from "@/types";
import { getLocalizedName } from "@/lib/utils";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import StatSummaryGrid from "./ui/StatSummaryGrid";
import AlertBanner from "./ui/AlertBanner";
import { getCategoryAccent } from "@/lib/designSystem";

interface VotesComparisonProps {
  matchId: string;
  criteresDefs: CritereDefinition[];
}

interface Vote {
  id: string;
  criteres: Record<string, number>;
  note_globale: number;
  device_fingerprint?: string | null;
  created_at?: string;
}

interface ComparisonStats {
  moyenne: number;
  min: number;
  max: number;
  count: number;
}

export default function VotesComparison({
  matchId,
  criteresDefs,
}: VotesComparisonProps) {
  const { t, locale } = useTranslations();
  const [votes, setVotes] = useState<Vote[]>([]);
  const [userVote, setUserVote] = useState<Vote | null>(null);
  const [loading, setLoading] = useState(true);
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    FingerprintJS.load()
      .then((fp) => fp.get())
      .then((result) => {
        if (!cancelled) {
          setFingerprint(result.visitorId);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFingerprint(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const fetchVotes = async () => {
      try {
        const [allVotesResponse, userVoteResponse] = await Promise.all([
          fetch(`/api/votes/${matchId}`),
          fingerprint
            ? fetch(`/api/votes/${matchId}/user?fingerprint=${fingerprint}`)
            : Promise.resolve(null),
        ]);

        if (allVotesResponse.ok) {
          const allVotes = await allVotesResponse.json();
          setVotes(allVotes);
        }

        if (userVoteResponse && userVoteResponse.ok) {
          const userVoteData = await userVoteResponse.json();
          setUserVote(userVoteData);
        }
      } catch (error) {
        console.error("Error fetching votes:", error);
      } finally {
        setLoading(false);
      }
    };

    if (fingerprint !== null) {
      fetchVotes();
    }
  }, [matchId, fingerprint]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <AlertBanner variant="info" message={t("common.loading")} />
      </div>
    );
  }

  if (votes.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          {t("matchDetail.comparison")}
        </h2>
        <AlertBanner variant="info" message={t("matchDetail.noOtherVotes")} />
      </div>
    );
  }

  // Calculer les statistiques pour chaque critère
  const calculateStats = (critereId: string): ComparisonStats => {
    const values = votes
      .map((v) => v.criteres[critereId])
      .filter((v) => typeof v === "number" && v > 0);

    if (values.length === 0) {
      return { moyenne: 0, min: 0, max: 0, count: 0 };
    }

    const sum = values.reduce((acc, val) => acc + val, 0);
    const moyenne = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return { moyenne, min, max, count: values.length };
  };

  // Calculer la moyenne globale
  const globalNoteStats = (() => {
    const values = votes
      .map((v) => v.note_globale)
      .filter((v) => typeof v === "number" && v > 0);

    if (values.length === 0) {
      return { moyenne: 0, min: 0, max: 0, count: 0 };
    }

    const sum = values.reduce((acc, val) => acc + val, 0);
    const moyenne = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return { moyenne, min, max, count: values.length };
  })();

  const categoryAverage = (category: string) => {
    const categoryCriteres = criteresDefs.filter((c) => c.categorie === category);
    if (!categoryCriteres.length) return null;

    const perVoteAverages: number[] = [];
    votes.forEach((vote) => {
      const values = categoryCriteres
        .map((critere) => vote.criteres?.[critere.id])
        .filter((value): value is number => typeof value === "number" && value > 0);

      if (values.length) {
        const sum = values.reduce((acc, val) => acc + val, 0);
        perVoteAverages.push(sum / values.length);
      }
    });

    if (!perVoteAverages.length) return null;
    const sum = perVoteAverages.reduce((acc, val) => acc + val, 0);
    return sum / perVoteAverages.length;
  };

  const arbitreMoyenne = categoryAverage("arbitre");
  const varMoyenne = categoryAverage("var");
  const assistantMoyenne = categoryAverage("assistant");

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        {t("matchDetail.comparison")}
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        {t("matchDetail.comparisonDescription", { count: votes.length })}
      </p>

      <StatSummaryGrid
        className="mb-6"
        items={[
          { label: t("matchDetail.arbitreNote"), value: arbitreMoyenne, accent: "arbitre" },
          { label: t("home.matchStats.var"), value: varMoyenne, accent: "var" },
          { label: t("home.matchStats.assistants"), value: assistantMoyenne, accent: "assistant" },
          {
            label: t("voteForm.noteGlobal"),
            value: globalNoteStats.moyenne,
            accent: "global",
            description: `${globalNoteStats.count} ${t("common.votes")}`,
          },
        ]}
      />

      {/* Tableau de comparaison */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              <th className="px-4 py-3 text-left">{t("matchDetail.criteria")}</th>
              <th className="px-4 py-3 text-center">{t("matchDetail.yourVote")}</th>
              <th className="px-4 py-3 text-center">{t("matchDetail.average")}</th>
              <th className="px-4 py-3 text-center">{t("matchDetail.min")}</th>
              <th className="px-4 py-3 text-center">{t("matchDetail.max")}</th>
            </tr>
          </thead>
          <tbody>
            {criteresDefs.map((critere) => {
              const label = getLocalizedName(locale, {
                defaultValue: critere.label_fr,
                fr: critere.label_fr,
                en: critere.label_en ?? critere.label_fr,
                ar: critere.label_ar ?? critere.label_fr,
              });
              const stats = calculateStats(critere.id);
              const userValue = userVote?.criteres[critere.id] || null;

              return (
                <tr key={critere.id} className="border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{label}</td>
                  <td className="px-4 py-3 text-center">
                    {userValue !== null ? (
                      <span className={`font-semibold ${getCategoryAccent(critere.categorie).text}`}>
                        {userValue.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {stats.count > 0 ? (
                      <span className={`font-semibold ${getCategoryAccent(critere.categorie).text}`}>
                        {stats.moyenne.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {stats.count > 0 ? (
                      <span className="text-gray-600 dark:text-gray-400">{stats.min.toFixed(1)}</span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {stats.count > 0 ? (
                      <span className="text-gray-600 dark:text-gray-400">{stats.max.toFixed(1)}</span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

