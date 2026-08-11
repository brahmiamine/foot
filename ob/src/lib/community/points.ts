import { getDataSource } from "@/lib/database";
import { ObPointsLedgerEntry, type ObPointsReason } from "@/entities/ObPointsLedgerEntry";
import { ObMember } from "@/entities/ObMember";

/**
 * Enregistre des points au grand livre et met à jour le cache
 * `ob_members.points` dans la même transaction — le classement (#16) lit
 * uniquement ce cache, jamais une somme sur le grand livre.
 */
export async function awardPoints(
  userId: string,
  points: number,
  reason: ObPointsReason,
  ref?: { type: string; id: string }
): Promise<void> {
  if (points === 0) return;

  const dataSource = await getDataSource();
  await dataSource.transaction(async (manager) => {
    await manager.getRepository(ObPointsLedgerEntry).insert({
      userId,
      points,
      reason,
      refType: ref?.type ?? null,
      refId: ref?.id ?? null,
    });
    await manager
      .getRepository(ObMember)
      .createQueryBuilder()
      .update()
      .set({ points: () => `points + ${Number(points)}` })
      .where("user_id = :userId", { userId })
      .execute();
  });
}
