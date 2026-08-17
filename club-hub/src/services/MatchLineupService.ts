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

  async findByMatch(teamId: string, ref: MatchRef): Promise<MatchLineup[]> {
    const repository = await this.getRepository();
    return repository.find({
      where: this.whereForMatch(teamId, ref),
      relations: ["player"],
      order: { role: "ASC", shirtNumber: "ASC" },
    });
  }

  /** Remplace intégralement le brouillon de composition pour un match. */
  async saveLineup(teamId: string, ref: MatchRef, entries: LineupEntryInput[]): Promise<MatchLineup[]> {
    const formationService = new MatchFormationService();
    if (await formationService.isEffectivelyLocked(teamId, ref)) {
      throw new Error("La composition approuvée ou verrouillée ne peut plus être modifiée");
    }

    const repository = await this.getRepository();
    await repository.delete(this.whereForMatch(teamId, ref));

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
      }),
    );

    const saved = rows.length === 0 ? [] : await repository.save(rows);
    await formationService.markDraftAfterEdit(teamId, ref);
    return saved;
  }

  /**
   * Composition des deux équipes pour un match officiel, tous clubs
   * confondus — utilisée par match-operations.
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
