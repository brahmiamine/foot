import { getDataSource } from "@/lib/database";
import { Match } from "@/entities/Match";
import { ObStadiumCheckin } from "@/entities/ObStadiumCheckin";
import { awardPoints } from "@/lib/community/points";
import { maybeAwardStadiumBadge } from "@/lib/community/badges";

export type CheckinResult = { ok: true } | { ok: false; error: "not_found" | "not_live" | "already" };

/**
 * Check-in stade (#28, +200 points) : auto-déclaré par le supporter, sans
 * QR/géolocalisation (la billetterie qui permettrait une vérification
 * réelle attend Stripe, phase 4) — limité aux matchs actuellement en cours
 * pour rester crédible.
 */
export async function checkIn(userId: string, matchId: string): Promise<CheckinResult> {
  const dataSource = await getDataSource();
  const match = await dataSource.getRepository(Match).findOne({ where: { id: matchId } });
  if (!match) return { ok: false, error: "not_found" };
  if (match.status !== "IN_PROGRESS") return { ok: false, error: "not_live" };

  const repository = dataSource.getRepository(ObStadiumCheckin);
  const existing = await repository.findOne({ where: { userId, matchId } });
  if (existing) return { ok: false, error: "already" };

  await repository.save(repository.create({ userId, matchId }));
  await awardPoints(userId, 200, "CHECKIN", { type: "MATCH", id: matchId });
  await maybeAwardStadiumBadge(userId);

  return { ok: true };
}
