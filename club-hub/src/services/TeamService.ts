import { randomUUID } from "node:crypto";
import { getDataSource } from "@/lib/database";
import { Team } from "@/entities/Team";
import { Like, Not, Repository } from "typeorm";

/**
 * Service for Team operations.
 * `teams` est une table partagée avec ArbiNote et cardManager : cette app ne
 * fait que lire les informations du club de l'utilisateur connecté. La
 * création/édition d'équipes du référentiel du club connecté reste dans
 * cardManager. `searchByName`/`createExternal` servent uniquement au
 * sélecteur d'adversaire des matchs amicaux (club-hub), pour retrouver
 * ou ajouter un club tiers déjà/à référencer dans `teams` — jamais pour
 * modifier une équipe existante.
 */
export class TeamService {
  private async getRepository(): Promise<Repository<Team>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Team);
  }

  /**
   * Get a team by id (le club de l'utilisateur connecté)
   */
  async findById(teamId: string): Promise<Team | null> {
    const repository = await this.getRepository();
    return repository.findOne({
      where: { id: teamId },
      relations: ["federation"],
    });
  }

  /** Recherche un club adverse (hors club connecté) par nom, pour le sélecteur de match amical. */
  async searchByName(query: string, excludeTeamId: string): Promise<Team[]> {
    const repository = await this.getRepository();
    const trimmed = query.trim();
    if (!trimmed) return [];
    return repository.find({
      where: { nom: Like(`%${trimmed}%`), id: Not(excludeTeamId) },
      order: { nom: "ASC" },
      take: 20,
    });
  }

  /** Liste des clubs du référentiel (hors club connecté), pour le sélecteur d'adversaire. */
  async findAllClubs(excludeTeamId: string): Promise<Team[]> {
    const repository = await this.getRepository();
    return repository.find({ where: { teamType: "club", id: Not(excludeTeamId) }, order: { nom: "ASC" } });
  }

  /** Crée un nouveau club dans le référentiel partagé (adversaire non répertorié). */
  async createExternal(data: { nom: string; city?: string | null; logoUrl?: string | null }): Promise<Team> {
    const repository = await this.getRepository();
    const team = repository.create({
      id: randomUUID(),
      nom: data.nom,
      city: data.city ?? null,
      logoUrl: data.logoUrl ?? null,
      teamType: "club",
      sport: "football",
      ageCategory: "seniors",
      gender: "male",
    });
    return repository.save(team);
  }
}
