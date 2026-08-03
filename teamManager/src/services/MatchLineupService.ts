import { getDataSource } from "@/lib/database";
import { MatchLineup } from "@/entities/MatchLineup";
import { Repository } from "typeorm";
import { LineupEntryInput } from "@/types/lineups";

/**
 * Service for MatchLineup operations (composition d'un match : titulaires /
 * remplaçants de l'équipe du club connecté).
 */
export class MatchLineupService {
  private async getRepository(): Promise<Repository<MatchLineup>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(MatchLineup);
  }

  /**
   * Composition de l'équipe du club connecté pour un match donné.
   */
  async findByMatch(matchId: string, teamId: string): Promise<MatchLineup[]> {
    const repository = await this.getRepository();
    return repository.find({
      where: { matchId, teamId },
      relations: ["player"],
      order: { role: "ASC", shirtNumber: "ASC" },
    });
  }

  /**
   * Remplace intégralement la composition d'un match pour l'équipe du club
   * connecté (supprime les entrées existantes puis recrée à partir de la
   * liste fournie — plus simple et robuste qu'un diff incrémental).
   */
  async saveLineup(matchId: string, teamId: string, entries: LineupEntryInput[]): Promise<MatchLineup[]> {
    const repository = await this.getRepository();

    await repository.delete({ matchId, teamId });

    if (entries.length === 0) return [];

    const rows = entries.map((entry) =>
      repository.create({
        teamId,
        matchId,
        playerId: entry.playerId,
        role: entry.role,
        shirtNumber: entry.shirtNumber ?? null,
        position: entry.position ?? null,
        isCaptain: entry.isCaptain ?? false,
      })
    );

    return repository.save(rows);
  }

  /**
   * Composition des deux équipes pour un match, tous clubs confondus —
   * utilisée par le projet "matchsheet" (feuille de match), pas de scoping
   * par team_id ici puisque les deux équipes d'un même match peuvent
   * appartenir à des clubs différents.
   */
  async findAllForMatch(matchId: string): Promise<MatchLineup[]> {
    const repository = await this.getRepository();
    return repository.find({
      where: { matchId },
      relations: ["player", "team"],
      order: { role: "ASC", shirtNumber: "ASC" },
    });
  }
}
