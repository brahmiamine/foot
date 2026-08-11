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

let cachedTeams: Team[] | undefined;

/**
 * Toutes les équipes du club (première, féminine, jeunes...), pour le
 * sélecteur de suivi de l'espace membre (#14). Résolu par nom une fois
 * `getObTeam()` connu, puisque `teams` n'a pas de colonne de regroupement
 * par club — seulement une ligne par (nom, sport, catégorie d'âge).
 */
export async function getObTeams(): Promise<Team[]> {
  if (cachedTeams !== undefined) {
    return cachedTeams;
  }

  const reference = await getObTeam();
  if (!reference) {
    cachedTeams = [];
    return cachedTeams;
  }

  const dataSource = await getDataSource();
  const repository = dataSource.getRepository(Team);
  const clubName = reference.nom.replace(/\s*\(.*\)\s*$/, "").trim();

  const teams = await repository.find({
    where: { nom: Like(`%${clubName}%`) },
    order: { sport: "ASC", ageCategory: "ASC" },
  });

  cachedTeams = teams.length > 0 ? teams : [reference];
  return cachedTeams;
}
