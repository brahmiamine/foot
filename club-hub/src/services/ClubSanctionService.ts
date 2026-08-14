import { ClubSanction, ClubSanctionHistory } from "@/entities/ClubSanction";
import { getDataSource } from "@/lib/database";
import { blocksRegistrations, blocksTransfers, isClubSanctionEnforceable } from "../../../packages/regulatory-shared/src/clubSanction";

/**
 * Lecture seule côté club-hub : la fédération est seule source de vérité
 * des sanctions (créées/levées depuis federation-hub, voir
 * federation-hub/src/lib/clubSanctions.ts). club-hub ne fait que consulter
 * la même table partagée et l'utiliser comme garde serveur pour ses propres
 * workflows (transferts, inscriptions).
 */
export async function listClubSanctionsForClub(clubId: string) {
  const dataSource = await getDataSource();
  const sanctions = await dataSource.getRepository(ClubSanction).find({ where: { clubId }, order: { createdAt: "DESC" } });
  return sanctions.map((sanction) => Object.assign(sanction, { enforceable: isClubSanctionEnforceable(sanction.status, sanction.startsAt, sanction.endsAt) }));
}

export async function getClubSanctionHistoryForClub(clubId: string, sanctionId: string) {
  const dataSource = await getDataSource();
  const sanction = await dataSource.getRepository(ClubSanction).findOne({ where: { id: sanctionId, clubId } });
  if (!sanction) return null;
  const history = await dataSource.getRepository(ClubSanctionHistory).find({ where: { sanctionId }, order: { createdAt: "DESC" } });
  return { sanction, history };
}

/** Sanctions actuellement opposables au club bloquant les transferts (`TRANSFER_BAN`). */
export async function hasActiveTransferBan(clubId: string): Promise<ClubSanction | null> {
  const dataSource = await getDataSource();
  const sanctions = await dataSource.getRepository(ClubSanction).find({ where: { clubId, status: "ACTIVE" } });
  return sanctions.find((sanction) => blocksTransfers(sanction.type) && isClubSanctionEnforceable(sanction.status, sanction.startsAt, sanction.endsAt)) ?? null;
}

/** Sanctions actuellement opposables au club bloquant les nouvelles inscriptions (`REGISTRATION_BAN`). */
export async function hasActiveRegistrationBan(clubId: string): Promise<ClubSanction | null> {
  const dataSource = await getDataSource();
  const sanctions = await dataSource.getRepository(ClubSanction).find({ where: { clubId, status: "ACTIVE" } });
  return sanctions.find((sanction) => blocksRegistrations(sanction.type) && isClubSanctionEnforceable(sanction.status, sanction.startsAt, sanction.endsAt)) ?? null;
}
