import { getDataSource } from "@/lib/database";
import { Convocation, ConvocationResponse } from "@/entities/Convocation";
import { MatchLineup } from "@/entities/MatchLineup";
import { Repository } from "typeorm";
import { MatchRef } from "./MatchFormationService";

/**
 * Service for Convocation operations (joueurs convoqués pour un match,
 * suivi de présence). Supporte les matchs officiels (table partagée
 * `matches`) et les matchs amicaux (`cms_friendly_matches`).
 */
export class ConvocationService {
  private async getRepository(): Promise<Repository<Convocation>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Convocation);
  }

  private whereForMatch(teamId: string, ref: MatchRef) {
    return ref.matchType === "OFFICIAL"
      ? { teamId, matchType: "OFFICIAL" as const, matchId: ref.matchId ?? undefined }
      : { teamId, matchType: "FRIENDLY" as const, friendlyMatchId: ref.friendlyMatchId ?? undefined };
  }

  /**
   * Get all convocations for a team, most recent match first.
   */
  async findAll(teamId: string): Promise<Convocation[]> {
    const repository = await this.getRepository();
    return repository.find({
      where: { teamId },
      relations: ["player", "match", "match.homeTeam", "match.awayTeam", "friendlyMatch", "friendlyMatch.opponentTeam"],
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Get convocations for a specific match (officiel ou amical).
   */
  async findByMatch(teamId: string, ref: MatchRef): Promise<Convocation[]> {
    const repository = await this.getRepository();
    return repository.find({
      where: this.whereForMatch(teamId, ref),
      relations: ["player"],
      order: { createdAt: "ASC" },
    });
  }

  async findById(id: number, teamId: string): Promise<Convocation | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id, teamId }, relations: ["player", "match", "friendlyMatch"] });
  }

  /**
   * Convoquer une liste de joueurs pour un match (officiel ou amical). Les
   * joueurs déjà convoqués pour ce match sont ignorés (pas de doublon).
   */
  async createBulk(
    data: { ref: MatchRef; playerIds: string[]; notes?: string | null },
    teamId: string
  ): Promise<Convocation[]> {
    const repository = await this.getRepository();
    const existing = await repository.find({ where: this.whereForMatch(teamId, data.ref) });
    const existingPlayerIds = new Set(existing.map((c) => c.playerId));

    const toCreate = data.playerIds
      .filter((playerId) => !existingPlayerIds.has(playerId))
      .map((playerId) =>
        repository.create({
          teamId,
          matchType: data.ref.matchType,
          matchId: data.ref.matchType === "OFFICIAL" ? data.ref.matchId : null,
          friendlyMatchId: data.ref.matchType === "FRIENDLY" ? data.ref.friendlyMatchId : null,
          playerId,
          notes: data.notes ?? null,
          notifiedAt: new Date(),
        })
      );

    if (toCreate.length === 0) return [];
    return repository.save(toCreate);
  }

  /**
   * Envoie (ou met à jour) les convocations de tous les joueurs présents
   * dans la composition (titulaires + remplaçants) d'un match, avec leur
   * rôle. Utilisé par le bouton « Envoyer les convocations » de l'éditeur
   * de composition.
   */
  async sendFromLineup(teamId: string, ref: MatchRef): Promise<Convocation[]> {
    const dataSource = await getDataSource();
    const lineupRepository = dataSource.getRepository(MatchLineup);
    const repository = await this.getRepository();

    const lineupWhere =
      ref.matchType === "OFFICIAL"
        ? { teamId, matchType: "OFFICIAL" as const, matchId: ref.matchId ?? undefined }
        : { teamId, matchType: "FRIENDLY" as const, friendlyMatchId: ref.friendlyMatchId ?? undefined };
    const lineup = await lineupRepository.find({ where: lineupWhere });
    if (lineup.length === 0) return [];

    const existing = await repository.find({ where: this.whereForMatch(teamId, ref) });
    const existingByPlayer = new Map(existing.map((c) => [c.playerId, c]));

    const now = new Date();
    const toSave = lineup.map((entry) => {
      const current = existingByPlayer.get(entry.playerId);
      if (current) {
        current.lineupRole = entry.role;
        current.notifiedAt = now;
        return current;
      }
      return repository.create({
        teamId,
        matchType: ref.matchType,
        matchId: ref.matchType === "OFFICIAL" ? ref.matchId : null,
        friendlyMatchId: ref.matchType === "FRIENDLY" ? ref.friendlyMatchId : null,
        playerId: entry.playerId,
        lineupRole: entry.role,
        notifiedAt: now,
      });
    });

    return repository.save(toSave);
  }

  async updateResponse(id: number, teamId: string, response: ConvocationResponse): Promise<Convocation> {
    const repository = await this.getRepository();
    const convocation = await this.findById(id, teamId);
    if (!convocation) {
      throw new Error("Convocation non trouvée");
    }
    convocation.response = response;
    convocation.respondedAt = new Date();
    return repository.save(convocation);
  }

  async delete(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getRepository();
    const convocation = await this.findById(id, teamId);
    if (!convocation) {
      throw new Error("Convocation non trouvée");
    }
    await repository.remove(convocation);
    return true;
  }
}
