import { getDataSource } from "@/lib/database";
import { Goal } from "@/entities/Goal";
import { Substitution } from "@/entities/Substitution";
import { Injury } from "@/entities/Injury";
import { Card, type MatchPeriod } from "@/entities/Card";

export type LiveEventType = "GOAL" | "CARD" | "SUBSTITUTION" | "INJURY";

export interface LiveEvent {
  id: string;
  type: LiveEventType;
  minute: number | null;
  period: MatchPeriod | null;
  teamId: string | null;
  label: string;
  detail?: string;
}

const PERIOD_ORDER: Record<MatchPeriod, number> = { H1: 0, H2: 1, ET1: 2, ET2: 3 };

function playerName(player?: { firstNameFr: string; lastNameFr: string } | null): string {
  if (!player) return "Joueur";
  return `${player.firstNameFr} ${player.lastNameFr}`;
}

function sortKey(period: MatchPeriod | null | undefined, minute: number | null | undefined): number {
  return (period ? PERIOD_ORDER[period] : 0) * 1000 + (minute ?? 0);
}

/**
 * Lit les événements produits par match-operations (`ms_goals`, `ms_substitutions`,
 * `Card`, `ms_injuries`) pour un match donné et les fusionne en un fil
 * chronologique unique. Lecture seule — voir roadmap.md §8 (Live Match côté OB).
 */
export class LiveMatchService {
  async getEvents(matchId: string): Promise<LiveEvent[]> {
    const ds = await getDataSource();

    const [goals, cards, substitutions, injuries] = await Promise.all([
      ds.getRepository(Goal).find({ where: { matchId }, relations: ["player", "team"] }),
      ds.getRepository(Card).find({ where: { matchId }, relations: ["player"] }),
      ds.getRepository(Substitution).find({ where: { matchId }, relations: ["playerOut", "playerIn", "team"] }),
      ds.getRepository(Injury).find({ where: { matchId }, relations: ["player", "team"] }),
    ]);

    const events: LiveEvent[] = [];

    for (const goal of goals) {
      events.push({
        id: `goal-${goal.id}`,
        type: "GOAL",
        minute: goal.minute,
        period: goal.period,
        teamId: goal.teamId,
        label: goal.isOwnGoal ? `But contre son camp — ${playerName(goal.player)}` : `But — ${playerName(goal.player)}`,
        detail: goal.isPenalty ? "Sur penalty" : undefined,
      });
    }

    for (const card of cards) {
      const label =
        card.type === "RED"
          ? `Carton rouge — ${playerName(card.player)}`
          : card.type === "DOUBLE_YELLOW"
            ? `Deuxième jaune (rouge) — ${playerName(card.player)}`
            : `Carton jaune — ${playerName(card.player)}`;
      events.push({
        id: `card-${card.id}`,
        type: "CARD",
        minute: card.minute ?? null,
        period: card.period ?? null,
        teamId: null,
        label,
      });
    }

    for (const sub of substitutions) {
      events.push({
        id: `sub-${sub.id}`,
        type: "SUBSTITUTION",
        minute: sub.minute,
        period: sub.period,
        teamId: sub.teamId,
        label: `Remplacement — ${playerName(sub.playerIn)} entre, ${playerName(sub.playerOut)} sort`,
      });
    }

    for (const injury of injuries) {
      events.push({
        id: `injury-${injury.id}`,
        type: "INJURY",
        minute: injury.minute ?? null,
        period: injury.period ?? null,
        teamId: injury.teamId,
        label: `Blessure — ${playerName(injury.player)}`,
      });
    }

    return events.sort((a, b) => sortKey(a.period, a.minute) - sortKey(b.period, b.minute));
  }

  /** Score courant reconstruit à partir des buts (hors CSC comptés côté équipe adverse). */
  async getLiveScore(matchId: string, homeTeamId: string, awayTeamId: string): Promise<{ home: number; away: number }> {
    const ds = await getDataSource();
    const goals = await ds.getRepository(Goal).find({ where: { matchId } });

    let home = 0;
    let away = 0;
    for (const goal of goals) {
      const scoringTeam = goal.isOwnGoal ? (goal.teamId === homeTeamId ? awayTeamId : homeTeamId) : goal.teamId;
      if (scoringTeam === homeTeamId) home++;
      else if (scoringTeam === awayTeamId) away++;
    }
    return { home, away };
  }
}
