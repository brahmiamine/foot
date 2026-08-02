import { MouseEvent } from "react";
import VotedBadge from "../VotedBadge";
import LiveMatchBadge from "../LiveMatchBadge";
import MatchCredibility from "../MatchCredibility";
import { Match } from "@/types";
import { TFunction } from "./types";

interface MatchCardHeaderProps {
  t: TFunction;
  matchId: string;
  matchDate: Match["date"];
  journeeLabel: string | null;
  dateLabel: string;
  credibility?: number | null;
  totalVotes?: number;
  canShare: boolean;
  onOpenShareModal: (event: MouseEvent) => void;
}

export function MatchCardHeader({
  t,
  matchId,
  matchDate,
  journeeLabel,
  dateLabel,
  credibility,
  totalVotes,
  canShare,
  onOpenShareModal,
}: MatchCardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs uppercase text-gray-400 dark:text-gray-500 mb-4 gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span>{journeeLabel || t("common.matchday")}</span>
        <span>{dateLabel}</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <VotedBadge matchId={matchId} />
        <LiveMatchBadge matchDate={matchDate} />
        <MatchCredibility matchId={matchId} credibility={credibility} totalVotes={totalVotes} />
        {canShare && (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50/60 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
            onClick={onOpenShareModal}
            aria-label={t("share.buttonLabel")}
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 6l-4-4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 2v14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t("share.buttonLabel")}
          </button>
        )}
      </div>
    </div>
  );
}
