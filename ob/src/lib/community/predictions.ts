import { IsNull } from "typeorm";
import { getDataSource } from "@/lib/database";
import { Match } from "@/entities/Match";
import { ObPrediction } from "@/entities/ObPrediction";
import { awardPoints } from "@/lib/community/points";
import { maybeAwardPredictionBadges, maybeAwardLegendBadge } from "@/lib/community/badges";

export type SubmitPredictionResult =
  | { ok: true; prediction: ObPrediction }
  | { ok: false; error: "not_found" | "closed" };

/**
 * Un seul pronostic par match et par membre, modifiable tant que le match
 * n'a pas démarré (`status === "UPCOMING"`). Les points de participation
 * (+20) ne sont crédités qu'à la création, pas à chaque modification.
 */
export async function submitPrediction(
  userId: string,
  matchId: string,
  scoreHome: number,
  scoreAway: number,
  obTeamId: string
): Promise<SubmitPredictionResult> {
  const dataSource = await getDataSource();
  const match = await dataSource.getRepository(Match).findOne({ where: { id: matchId } });
  if (!match) return { ok: false, error: "not_found" };
  if (match.status !== "UPCOMING") return { ok: false, error: "closed" };

  const repository = dataSource.getRepository(ObPrediction);
  const existing = await repository.findOne({ where: { matchId, userId } });

  if (existing) {
    existing.scoreHome = scoreHome;
    existing.scoreAway = scoreAway;
    await repository.save(existing);
    return { ok: true, prediction: existing };
  }

  const prediction = repository.create({ matchId, userId, scoreHome, scoreAway });
  await repository.save(prediction);

  await awardPoints(userId, 20, "PREDICTION", { type: "MATCH", id: matchId });
  await maybeAwardPredictionBadges(userId, { equipeAway: match.equipeAway }, obTeamId);

  return { ok: true, prediction };
}

/**
 * Note les pronostics en attente d'un match désormais terminé (+100 points
 * en cas de score exact). Appelée paresseusement depuis les pages qui
 * affichent des pronostics/le classement, faute de webhook depuis
 * ArbiNote/cardManager quand un match passe à FINISHED.
 */
export async function scorePendingPredictions(matchId: string): Promise<void> {
  const dataSource = await getDataSource();
  const match = await dataSource.getRepository(Match).findOne({ where: { id: matchId } });
  if (!match || match.status !== "FINISHED" || match.scoreHome == null || match.scoreAway == null) {
    return;
  }

  const repository = dataSource.getRepository(ObPrediction);
  const unscored = await repository.find({ where: { matchId, pointsAwarded: IsNull() } });

  for (const prediction of unscored) {
    const exact = prediction.scoreHome === match.scoreHome && prediction.scoreAway === match.scoreAway;
    prediction.pointsAwarded = exact ? 100 : 0;
    await repository.save(prediction);

    if (exact) {
      await awardPoints(prediction.userId, 100, "PREDICTION_EXACT", { type: "MATCH", id: matchId });
      await maybeAwardLegendBadge(prediction.userId);
    }
  }
}

export async function scorePendingPredictionsForTeam(teamId: string): Promise<void> {
  const dataSource = await getDataSource();
  const finished = await dataSource.getRepository(Match).find({
    where: [
      { equipeHome: teamId, status: "FINISHED" },
      { equipeAway: teamId, status: "FINISHED" },
    ],
    order: { date: "DESC" },
    take: 10,
  });

  for (const match of finished) {
    await scorePendingPredictions(match.id);
  }
}
