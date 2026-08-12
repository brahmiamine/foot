"use client";

import { useEffect } from "react";
import { useTranslations } from "@/lib/i18n";
import { useVote } from "@/contexts/VoteContext";
import { useMounted } from "@/lib/useMounted";

interface VotedBadgeProps {
  matchId: string;
}

export default function VotedBadge({ matchId }: VotedBadgeProps) {
  const { t } = useTranslations();
  const { hasVoted, refreshVotedMatches } = useVote();
  const mounted = useMounted();

  // Vérifier le vote via le contexte (dynamique depuis la DB)
  const voted = hasVoted(matchId);

  useEffect(() => {
    // Rafraîchir périodiquement la liste des matchs votés (toutes les 10 secondes)
    const interval = setInterval(() => {
      refreshVotedMatches();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [refreshVotedMatches]);

  // Ne rien afficher avant le montage pour éviter les problèmes d'hydratation
  if (!mounted) return null;

  // Si pas voté, ne rien afficher
  if (!voted) return null;

  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-300 text-xs font-semibold rounded-full border border-violet-300 dark:border-violet-700"
      onClick={(e) => e.stopPropagation()}
      style={{ display: "inline-flex", flexShrink: 0 }}
    >
      <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
      <span className="whitespace-nowrap">{t("matchCard.alreadyVoted")}</span>
    </span>
  );
}
