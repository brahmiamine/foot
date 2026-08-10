import { getDataSource } from "@/lib/database";
import { MatchLineup } from "@/entities/MatchLineup";
import { Repository } from "typeorm";
import { LineupEntryInput } from "@/types/lineups";
import { MatchFormationService, MatchRef } from "./MatchFormationService";

/**
 * Service for MatchLineup operations (composition d'un match : titulaires /
 * remplaçants de l'équipe du club connecté). Supporte les matchs officiels
 * (table partagée `matches`) et les matchs amicaux (`cms_friendly_matches`).
 */
export class MatchLineupService {
  private async getRepository(): Promise<Repository<MatchLineup>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(MatchLineup);
  }

  private whereForMatch(teamId: string, ref: MatchRef) {
    return ref.matchType === "OFFICIAL"
      ? { teamId, matchType: "OFFICIAL" as const, matchId: ref.matchId ?? undefined }
      : { teamId, matchType: "FRIENDLY" as const, friendlyMatchId: ref.friendlyMatchId ?? undefined };
  }

  /**
   * Composition de l'équipe du club connecté pour un match donné.
   */
  async findByMatch(teamId: string, ref: MatchRef): Promise<MatchLineup[]> {
    const repository = await this.getRepository();
    return repository.find({
      where: this.whereForMatch(teamId, ref),
      relations: ["player"],
      order: { role: "ASC", shirtNumber: "ASC" },
    });
  }

  /**
   * Remplace intégralement la composition d'un match pour l'équipe du club
   * connecté (supprime les entrées existantes puis recrée à partir de la
   * liste fournie — plus simple et robuste qu'un diff incrémental).
   * Refuse l'écriture si le match est verrouillé (terminé/annulé).
   */
  async saveLineup(teamId: string, ref: MatchRef, entries: LineupEntryInput[]): Promise<MatchLineup[]> {
    const formationService = new MatchFormationService();
    if (await formationService.isEffectivelyLocked(teamId, ref)) {
      throw new Error("Ce match est terminé : la composition ne peut plus être modifiée");
    }

    const repository = await this.getRepository();
    await repository.delete(this.whereForMatch(teamId, ref));

    if (entries.length === 0) return [];

    const rows = entries.map((entry) =>
      repository.create({
        teamId,
        matchType: ref.matchType,
        matchId: ref.matchType === "OFFICIAL" ? ref.matchId : null,
        friendlyMatchId: ref.matchType === "FRIENDLY" ? ref.friendlyMatchId : null,
        playerId: entry.playerId,
        role: entry.role,
        shirtNumber: entry.shirtNumber ?? null,
        position: entry.position ?? null,
        posX: entry.posX ?? null,
        posY: entry.posY ?? null,
        isCaptain: entry.isCaptain ?? false,
      })
    );

    return repository.save(rows);
  }

  /**
   * Composition des deux équipes pour un match officiel, tous clubs
   * confondus — utilisée par le projet "matchsheet" (feuille de match), pas
   * de scoping par team_id ici puisque les deux équipes d'un même match
   * peuvent appartenir à des clubs différents.
   */
  async findAllForMatch(matchId: string): Promise<MatchLineup[]> {
    const repository = await this.getRepository();
    return repository.find({
      where: { matchId, matchType: "OFFICIAL" },
      relations: ["player", "team"],
      order: { role: "ASC", shirtNumber: "ASC" },
    });
  }
}
