import { getDataSource } from "@/lib/database";
import { Goal } from "@/entities/Goal";
import { Card, type MatchPeriod } from "@/entities/Card";
import { Substitution } from "@/entities/Substitution";
import { MatchInjury } from "@/entities/MatchInjury";

export type MatchFactType = "GOAL" | "CARD" | "SUBSTITUTION" | "INJURY";

export interface MatchFact {
  id: string;
  type: MatchFactType;
  minute: number | null;
  period: MatchPeriod | null;
  teamId: string | null;
  label: string;
  detail?: string;
  neutralized?: boolean;
}

const PERIOD_ORDER: Record<MatchPeriod, number> = { H1: 0, H2: 1, ET1: 2, ET2: 3 };

function sortKey(period: MatchPeriod | null | undefined, minute: number | null | undefined): number {
  return (period ? PERIOD_ORDER[period] : 0) * 1000 + (minute ?? 0);
}

function playerName(player?: { firstNameFr: string; lastNameFr: string } | null): string {
  if (!player) return "Joueur";
  return `${player.firstNameFr} ${player.lastNameFr}`;
}

/**
 * Fusionne les faits de match (buts, cartons, blessures, remplacements)
 * saisis par `match-operations` en un fil chronologique unique, en lecture seule
 * (voir db/OWNERSHIP.md). Les buts/blessures/remplacements annulés sont
 * exclus ; les cartons neutralisés (double jaune, cumul) restent visibles
 * mais marqués `neutralized`, car ils restent un fait de match réel.
 *
 * L'appelant est responsable de vérifier que `matchId` appartient bien à
 * l'équipe du club connecté (voir MatchService.findById) avant d'appeler ce
 * service : il ne fait aucun filtrage par équipe lui-même.
 */
export class MatchFactsService {
  async getFacts(matchId: string): Promise<MatchFact[]> {
    const dataSource = await getDataSource();

    const [goals, cards, substitutions, injuries] = await Promise.all([
      dataSource.getRepository(Goal).find({ where: { matchId }, relations: ["player"] }),
      dataSource.getRepository(Card).find({ where: { matchId }, relations: ["player"] }),
      dataSource.getRepository(Substitution).find({ where: { matchId }, relations: ["playerOut", "playerIn"] }),
      dataSource.getRepository(MatchInjury).find({ where: { matchId }, relations: ["player"] }),
    ]);

    const facts: MatchFact[] = [];

    for (const goal of goals) {
      if (goal.cancelledAt) continue;
      facts.push({
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
      facts.push({
        id: `card-${card.id}`,
        type: "CARD",
        minute: card.minute ?? null,
        period: card.period ?? null,
        teamId: null,
        label,
        neutralized: card.isNeutralized,
      });
    }

    for (const sub of substitutions) {
      if (sub.cancelledAt) continue;
      facts.push({
        id: `sub-${sub.id}`,
        type: "SUBSTITUTION",
        minute: sub.minute,
        period: sub.period,
        teamId: sub.teamId,
        label: `Remplacement — ${playerName(sub.playerIn)} entre, ${playerName(sub.playerOut)} sort`,
      });
    }

    for (const injury of injuries) {
      if (injury.cancelledAt) continue;
      facts.push({
        id: `injury-${injury.id}`,
        type: "INJURY",
        minute: injury.minute ?? null,
        period: injury.period ?? null,
        teamId: injury.teamId,
        label: `Blessure — ${playerName(injury.player)}`,
      });
    }

    return facts.sort((a, b) => sortKey(a.period, a.minute) - sortKey(b.period, b.minute));
  }
}
