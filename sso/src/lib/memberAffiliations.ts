import { getDataSource } from "./db";
import { MemberTeamAffiliation } from "@/entities/MemberTeamAffiliation";
import { Team } from "@/entities/Team";

export interface AffiliatedTeam {
  id: string;
  nom: string;
  nomAr: string | null;
  logoUrl: string | null;
}

/**
 * Clubs suivis par un membre. Purement informatif (préférences supporter) —
 * ne conditionne aucune autorisation, voir MemberTeamAffiliation.
 */
export async function listMemberAffiliations(userId: string): Promise<AffiliatedTeam[]> {
  const dataSource = await getDataSource();
  const affiliations = await dataSource.getRepository(MemberTeamAffiliation).find({ where: { userId } });
  if (affiliations.length === 0) return [];

  const teamIds = affiliations.map((affiliation) => affiliation.teamId);
  const teams = await dataSource
    .getRepository(Team)
    .createQueryBuilder("team")
    .where("team.id IN (:...teamIds)", { teamIds })
    .orderBy("team.nom", "ASC")
    .getMany();

  return teams.map((team) => ({
    id: team.id,
    nom: team.nom,
    nomAr: team.nomAr ?? null,
    logoUrl: team.logoUrl ?? null,
  }));
}

export type AddAffiliationResult = { ok: true } | { ok: false; error: "team_not_found" };

export async function addMemberAffiliation(userId: string, teamId: string): Promise<AddAffiliationResult> {
  const dataSource = await getDataSource();

  const team = await dataSource.getRepository(Team).findOne({ where: { id: teamId } });
  if (!team) {
    return { ok: false, error: "team_not_found" };
  }

  const repository = dataSource.getRepository(MemberTeamAffiliation);
  const existing = await repository.findOne({ where: { userId, teamId } });
  if (!existing) {
    await repository.save(repository.create({ userId, teamId }));
  }
  return { ok: true };
}

export async function removeMemberAffiliation(userId: string, teamId: string): Promise<void> {
  const dataSource = await getDataSource();
  await dataSource.getRepository(MemberTeamAffiliation).delete({ userId, teamId });
}
