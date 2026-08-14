import { getDataSource } from "@/lib/db";
import { Goal } from "@/entities/Goal";

export interface LiveScore {
  [teamId: string]: number;
}

/**
 * Score déterministe recalculé à partir des buts non annulés (§TASK-P0-009) :
 * un but marque pour son équipe (`teamId`), sauf un csc (`isOwnGoal`) qui
 * marque pour l'adversaire — nécessite donc de connaître les deux équipes
 * du match, pas seulement l'équipe du but.
 *
 * Volontairement PAS persisté dans `matches.score_home/score_away` : ces
 * colonnes sont aujourd'hui alimentées manuellement par `federation-hub`
 * (`adminMatches.ts`, saisie admin) et leur propriété n'est pas documentée
 * dans `db/OWNERSHIP.md` — un recalcul automatique match-operations pourrait
 * silencieusement écraser une correction manuelle ou entrer en conflit avec
 * elle. Bloqué sur une décision de modélisation (qui écrit, quand) avant de
 * relier ce calcul à la colonne partagée ; voir todo.md.
 */
export async function computeLiveScore(
  matchId: string,
  homeTeamId: string,
  awayTeamId: string,
): Promise<{ home: number; away: number }> {
  const dataSource = await getDataSource();
  const goals = await dataSource.getRepository(Goal).find({ where: { matchId } });

  let home = 0;
  let away = 0;
  for (const goal of goals) {
    if (goal.cancelledAt) continue;
    // Un csc marque pour l'équipe adverse à celle du buteur.
    const scoringTeamId = goal.isOwnGoal
      ? goal.teamId === homeTeamId
        ? awayTeamId
        : homeTeamId
      : goal.teamId;
    if (scoringTeamId === homeTeamId) home += 1;
    else if (scoringTeamId === awayTeamId) away += 1;
  }

  return { home, away };
}
