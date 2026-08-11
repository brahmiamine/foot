import { getDataSource } from "@/lib/database";
import { ObMember } from "@/entities/ObMember";
import { ObMemberBadge } from "@/entities/ObMemberBadge";
import { ObPrediction } from "@/entities/ObPrediction";

/**
 * Catalogue des 8 badges OB (voir seed dans
 * ob/sql/migration_community_phase1.sql pour le libellé/icône). Seuls les
 * critères mesurables avec les données de la phase 1 sont attribués
 * automatiquement ici :
 * - premier-match / premier-déplacement / dix-pronostics : sur pronostic.
 * - fan-historique : à la création du profil (100 premiers membres).
 * - legende-ob : quand le total de points franchit 10 000.
 *
 * Les 3 autres badges (dix-matchs-suivis, dix-presences-stade,
 * supporter-fidele) dépendent de fonctionnalités pas encore construites
 * (check-in stade, suivi au long cours) : ils existent dans le catalogue
 * mais restent à attribution manuelle pour l'instant.
 */

async function awardBadge(userId: string, badgeId: string): Promise<void> {
  const dataSource = await getDataSource();
  await dataSource
    .createQueryBuilder()
    .insert()
    .into(ObMemberBadge)
    .values({ userId, badgeId })
    .orIgnore()
    .execute();
}

export async function maybeAwardHistoricFanBadge(userId: string): Promise<void> {
  const dataSource = await getDataSource();
  const repository = dataSource.getRepository(ObMember);
  const member = await repository.findOne({ where: { userId } });
  if (!member) return;

  const rank = await repository
    .createQueryBuilder("m")
    .where("m.created_at <= :createdAt", { createdAt: member.createdAt })
    .getCount();

  if (rank <= 100) {
    await awardBadge(userId, "fan-historique");
  }
}

export async function maybeAwardLegendBadge(userId: string): Promise<void> {
  const dataSource = await getDataSource();
  const member = await dataSource.getRepository(ObMember).findOne({ where: { userId } });
  if (member && member.points >= 10000) {
    await awardBadge(userId, "legende-ob");
  }
}

export async function maybeAwardPredictionBadges(
  userId: string,
  match: { equipeAway: string },
  obTeamId: string
): Promise<void> {
  const dataSource = await getDataSource();
  const repository = dataSource.getRepository(ObPrediction);
  const count = await repository.count({ where: { userId } });

  if (count === 1) {
    await awardBadge(userId, "premier-match");
  }
  if (count >= 10) {
    await awardBadge(userId, "dix-pronostics");
  }

  if (match.equipeAway === obTeamId) {
    const awayCount = await repository
      .createQueryBuilder("p")
      .innerJoin("matches", "m", "m.id = p.match_id")
      .where("p.user_id = :userId", { userId })
      .andWhere("m.equipe_away = :obTeamId", { obTeamId })
      .getCount();
    if (awayCount === 1) {
      await awardBadge(userId, "premier-deplacement");
    }
  }
}
