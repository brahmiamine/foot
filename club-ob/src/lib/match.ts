import type { Match } from "@/entities/Match";

export type MatchOutcome = "WIN" | "LOSS" | "DRAW";

export const OUTCOME_LABELS: Record<MatchOutcome, string> = {
  WIN: "Victoire",
  LOSS: "Défaite",
  DRAW: "Nul",
};

/** Match doit être `FINISHED` avec des scores renseignés. */
export function matchOutcomeForTeam(match: Match, teamId: string): MatchOutcome {
  const isHome = match.equipeHome === teamId;
  const teamScore = isHome ? match.scoreHome! : match.scoreAway!;
  const oppScore = isHome ? match.scoreAway! : match.scoreHome!;

  if (teamScore > oppScore) return "WIN";
  if (teamScore < oppScore) return "LOSS";
  return "DRAW";
}
