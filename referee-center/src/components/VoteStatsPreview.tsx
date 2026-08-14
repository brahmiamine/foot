"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "@/lib/i18n";
import { CritereDefinition } from "@/types";
import { roundNote } from "@/lib/utils";
import StatSummaryGrid from "./ui/StatSummaryGrid";
import AlertBanner from "./ui/AlertBanner";

interface VoteStatsPreviewProps {
  matchId: string;
  criteresDefs: CritereDefinition[];
}

interface VoteRecord {
  note_globale?: number | null;
  criteres: Record<string, number>;
}

interface StatsSnapshot {
  global: number | null;
  arbitre: number | null;
  var: number | null;
  assistant: number | null;
  votesCount: number;
}

export default function VoteStatsPreview({ matchId, criteresDefs }: VoteStatsPreviewProps) {
  const { t } = useTranslations();
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchVotes = async () => {
      try {
        setLoading(true);
        setHasError(false);
        const response = await fetch(`/api/votes/${matchId}`);
        if (!response.ok) {
          throw new Error("Unable to fetch votes");
        }
        const payload = await response.json();
        if (!active) return;
        setVotes(Array.isArray(payload) ? payload : []);
      } catch (error) {
        console.error("VoteStatsPreview error:", error);
        if (active) {
          setHasError(true);
          setVotes([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchVotes();
    return () => {
      active = false;
    };
  }, [matchId]);

  const stats = useMemo<StatsSnapshot>(() => {
    if (!votes.length) {
      return {
        global: null,
        arbitre: null,
        var: null,
        assistant: null,
        votesCount: 0,
      };
    }

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
      return roundNote(sum / perVoteAverages.length);
    };

    const globalValues = votes
      .map((vote) => vote.note_globale)
      .filter((value): value is number => typeof value === "number" && value > 0);

    const global = globalValues.length
      ? roundNote(globalValues.reduce((acc, val) => acc + val, 0) / globalValues.length)
      : null;

    return {
      global,
      arbitre: categoryAverage("arbitre"),
      var: categoryAverage("var"),
      assistant: categoryAverage("assistant"),
      votesCount: votes.length,
    };
  }, [votes, criteresDefs]);

  const hasVotesData = [stats.global, stats.arbitre, stats.var, stats.assistant].some(
    (value) => typeof value === "number" && !Number.isNaN(value)
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-5 mb-4 sm:mb-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t("matchDetail.statsPreviewTitle")}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t("matchDetail.statsPreviewDescription")}
          </p>
        </div>
        {stats.votesCount > 0 && (
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {t("matchDetail.statsPreviewVotes", { count: stats.votesCount })}
          </span>
        )}
      </div>

      {loading ? (
        <div className="h-12 bg-gray-200/60 dark:bg-gray-700/40 animate-pulse rounded-md" />
      ) : hasError ? (
        <AlertBanner variant="error" message={t("common.error")} />
      ) : hasVotesData ? (
        <StatSummaryGrid
          items={[
            { label: t("common.globalNote"), value: stats.global, accent: "global" },
            { label: t("matchDetail.arbitreNote"), value: stats.arbitre, accent: "arbitre" },
            { label: t("home.matchStats.var"), value: stats.var, accent: "var" },
            { label: t("home.matchStats.assistants"), value: stats.assistant, accent: "assistant" },
          ]}
        />
      ) : (
        <AlertBanner variant="info" message={t("matchDetail.statsPreviewNoVotes")} />
      )}
    </div>
  );
}


