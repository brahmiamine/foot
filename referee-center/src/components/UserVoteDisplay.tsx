"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "@/lib/i18n";
import { CritereDefinition } from "@/types";
import { getLocalizedName } from "@/lib/utils";
import StatSummaryGrid from "./ui/StatSummaryGrid";
import AlertBanner from "./ui/AlertBanner";
import { getCategoryAccent } from "@/lib/designSystem";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

interface UserVoteDisplayProps {
  matchId: string;
  criteresDefs: CritereDefinition[];
  initialVote?: Vote | null;
  fingerprint?: string | null;
}

interface Vote {
  id: string;
  criteres: Record<string, number>;
  note_globale: number;
  created_at?: string;
}

export default function UserVoteDisplay({ 
  matchId, 
  criteresDefs, 
  initialVote = null,
  fingerprint: providedFingerprint = null
}: UserVoteDisplayProps) {
  const { t, locale } = useTranslations();
  const [vote, setVote] = useState<Vote | null>(initialVote);
  const [loading, setLoading] = useState(!initialVote);
  const [fingerprint, setFingerprint] = useState<string | null>(providedFingerprint);

  useEffect(() => {
    // Si le fingerprint est déjà fourni, on ne le récupère pas
    if (providedFingerprint) {
      return;
    }

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
  }, [providedFingerprint]);

  useEffect(() => {
    // Si on a déjà le vote initial, on ne fait pas d'appel API
    if (initialVote) {
      setVote(initialVote);
      setLoading(false);
      return;
    }

    if (!fingerprint) {
      setLoading(false);
      return;
    }

    const fetchUserVote = async () => {
      try {
        console.log("Fetching vote for match:", matchId, "fingerprint:", fingerprint);
        const response = await fetch(
          `/api/votes/${matchId}/user?fingerprint=${fingerprint}`
        );
        console.log("Vote response status:", response.status);
        if (response.ok) {
          const data = await response.json();
          console.log("Vote data received:", data);
          setVote(data);
        } else if (response.status === 404) {
          console.log("Vote not found (404)");
          setVote(null);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("Error fetching user vote:", response.status, response.statusText, errorData);
          setVote(null);
        }
      } catch (error) {
        console.error("Error fetching user vote:", error);
        setVote(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserVote();
  }, [matchId, fingerprint, initialVote]);

  // Séparer les critères par catégorie
  const arbitreCriteres = useMemo(
    () => criteresDefs.filter((c) => c.categorie === "arbitre"),
    [criteresDefs]
  );
  const varCriteres = useMemo(
    () => criteresDefs.filter((c) => c.categorie === "var"),
    [criteresDefs]
  );
  const assistantCriteres = useMemo(
    () => criteresDefs.filter((c) => c.categorie === "assistant"),
    [criteresDefs]
  );

  const averageFor = useMemo(() => {
    return (criteresList: CritereDefinition[]) => {
      if (!vote) return null;
      const values = criteresList
        .map((c) => vote.criteres[c.id])
        .filter((v): v is number => typeof v === "number" && v > 0);
      if (!values.length) return null;
      const sum = values.reduce((acc, val) => acc + val, 0);
      return sum / values.length;
    };
  }, [vote]);

  const arbitreMoyenne = averageFor(arbitreCriteres);
  const varMoyenne = averageFor(varCriteres);
  const assistantMoyenne = averageFor(assistantCriteres);

  // Debug logs (à retirer en production)
  // IMPORTANT: Ce useEffect doit être AVANT tous les return conditionnels pour respecter les règles des Hooks
  useEffect(() => {
    console.log("UserVoteDisplay state:", {
      loading,
      hasVote: !!vote,
      vote: vote ? { id: vote.id, note_globale: vote.note_globale, criteres: Object.keys(vote.criteres) } : null,
      criteresCount: criteresDefs.length,
      arbitreCriteresCount: arbitreCriteres.length,
      varCriteresCount: varCriteres.length,
      assistantCriteresCount: assistantCriteres.length,
      matchId,
      fingerprint,
    });
  }, [loading, vote, criteresDefs.length, arbitreCriteres.length, varCriteres.length, assistantCriteres.length, matchId, fingerprint]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
        <AlertBanner variant="info" message={t("common.loading")} />
      </div>
    );
  }

  if (!vote) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          {t("matchDetail.myVotes")}
        </h2>
        <AlertBanner
          variant="warning"
          title={t("matchDetail.voteNotFound")}
          message={`Match ID: ${matchId} | Fingerprint: ${fingerprint ? "✓" : "✗"}`}
        />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        {t("matchDetail.myVotes")}
      </h2>

      <StatSummaryGrid
        className="mb-6"
        items={[
          { label: t("matchDetail.arbitreNote"), value: arbitreMoyenne, accent: "arbitre" },
          { label: t("home.matchStats.var"), value: varMoyenne, accent: "var" },
          { label: t("home.matchStats.assistants"), value: assistantMoyenne, accent: "assistant" },
          { label: t("voteForm.noteGlobal"), value: vote.note_globale, accent: "global" },
        ]}
      />

      {/* Tableau des votes */}
      <div className="overflow-x-auto">
        {criteresDefs.length === 0 ? (
          <AlertBanner variant="warning" message="Aucun critère défini. Veuillez contacter l'administrateur." />
        ) : (
          <table className="min-w-full text-sm rtl:text-right border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                <th className="px-4 py-3 text-left border-b border-gray-300 dark:border-gray-600">{t("matchDetail.criteria")}</th>
                <th className="px-4 py-3 text-left border-b border-gray-300 dark:border-gray-600">{t("matchDetail.yourVote")}</th>
              </tr>
            </thead>
            <tbody>
              {/* Section Arbitre */}
              {arbitreCriteres.length > 0 ? (
                <>
                  <tr className="bg-gray-50 dark:bg-gray-900/50">
                    <td colSpan={2} className="px-4 py-2 font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700">
                      {t("voteForm.section.arbitre")}
                    </td>
                  </tr>
                  {arbitreCriteres.map((critere) => {
                    const label = getLocalizedName(locale, {
                      defaultValue: critere.label_fr,
                      fr: critere.label_fr,
                      en: critere.label_en ?? critere.label_fr,
                      ar: critere.label_ar ?? critere.label_fr,
                    });
                    const value = vote.criteres[critere.id] || 0;
                    const accent = getCategoryAccent(critere.categorie);
                    return (
                      <tr key={critere.id} className="border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{label}</td>
                        <td className={`px-4 py-3 font-semibold ${accent.text}`}>
                          {value > 0 ? `${value.toFixed(2)}/5` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </>
              ) : (
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-gray-500 dark:text-gray-400 text-center">
                    Aucun critère arbitre défini
                  </td>
                </tr>
              )}

              {/* Section VAR */}
              {varCriteres.length > 0 && (
                <>
                  <tr className="bg-gray-50 dark:bg-gray-900/50">
                    <td colSpan={2} className="px-4 py-2 font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700">
                      {t("voteForm.section.var")}
                    </td>
                  </tr>
                  {varCriteres.map((critere) => {
                    const label = getLocalizedName(locale, {
                      defaultValue: critere.label_fr,
                      fr: critere.label_fr,
                      en: critere.label_en ?? critere.label_fr,
                      ar: critere.label_ar ?? critere.label_fr,
                    });
                    const value = vote.criteres[critere.id] || 0;
                    const accent = getCategoryAccent(critere.categorie);
                    return (
                      <tr key={critere.id} className="border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{label}</td>
                        <td className={`px-4 py-3 font-semibold ${accent.text}`}>
                          {value > 0 ? `${value.toFixed(2)}/5` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </>
              )}

              {/* Section Assistants */}
              {assistantCriteres.length > 0 && (
                <>
                  <tr className="bg-gray-50 dark:bg-gray-900/50">
                    <td colSpan={2} className="px-4 py-2 font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700">
                      {t("voteForm.section.assistant")}
                    </td>
                  </tr>
                  {assistantCriteres.map((critere) => {
                    const label = getLocalizedName(locale, {
                      defaultValue: critere.label_fr,
                      fr: critere.label_fr,
                      en: critere.label_en ?? critere.label_fr,
                      ar: critere.label_ar ?? critere.label_fr,
                    });
                    const value = vote.criteres[critere.id] || 0;
                    const accent = getCategoryAccent(critere.categorie);
                    return (
                      <tr key={critere.id} className="border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{label}</td>
                        <td className={`px-4 py-3 font-semibold ${accent.text}`}>
                          {value > 0 ? `${value.toFixed(2)}/5` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

