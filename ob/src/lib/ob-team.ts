import { Like } from "typeorm";
import { getDataSource } from "@/lib/database";
import { Team } from "@/entities/Team";

/**
 * Ce déploiement sert un seul club (l'Olympique de Béja) : on résout son
 * `teams.id` une fois puis on le garde en mémoire pour le process, au lieu
 * de le rescoper par requête comme teamManager (multi-club) le fait via la
 * session. OB_TEAM_ID doit être renseigné en production ; le fallback par
 * nom n'est là que pour démarrer sans configuration manuelle.
 */
let cachedTeam: Team | null | undefined;

export async function getObTeam(): Promise<Team | null> {
  if (cachedTeam !== undefined) {
    return cachedTeam;
  }

  const dataSource = await getDataSource();
  const repository = dataSource.getRepository(Team);

  const envId = process.env.OB_TEAM_ID?.trim();
  const team = envId
    ? await repository.findOne({ where: { id: envId }, relations: ["federation"] })
    : await repository.findOne({
        where: { nom: Like("%Béja%"), sport: "football", ageCategory: "seniors" },
        relations: ["federation"],
      });

  cachedTeam = team ?? null;
  return cachedTeam;
}
