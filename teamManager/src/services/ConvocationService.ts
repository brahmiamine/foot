import { getDataSource } from "@/lib/database";
import { Convocation, ConvocationResponse } from "@/entities/Convocation";
import { Repository } from "typeorm";

/**
 * Service for Convocation operations (joueurs convoqués pour un match,
 * suivi de présence).
 */
export class ConvocationService {
  private async getRepository(): Promise<Repository<Convocation>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Convocation);
  }

  /**
   * Get all convocations for a team, most recent match first.
   */
  async findAll(teamId: string): Promise<Convocation[]> {
    const repository = await this.getRepository();
    return repository.find({
      where: { teamId },
      relations: ["player", "match", "match.homeTeam", "match.awayTeam"],
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Get convocations for a specific match.
   */
  async findByMatch(matchId: string, teamId: string): Promise<Convocation[]> {
    const repository = await this.getRepository();
    return repository.find({
      where: { matchId, teamId },
      relations: ["player"],
      order: { createdAt: "ASC" },
    });
  }

  async findById(id: number, teamId: string): Promise<Convocation | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id, teamId }, relations: ["player", "match"] });
  }

  /**
   * Convoquer une liste de joueurs pour un match. Les joueurs déjà convoqués
   * pour ce match sont ignorés (pas de doublon).
   */
  async createBulk(
    data: { matchId: string; playerIds: string[]; notes?: string | null },
    teamId: string
  ): Promise<Convocation[]> {
    const repository = await this.getRepository();
    const existing = await repository.find({ where: { matchId: data.matchId, teamId } });
    const existingPlayerIds = new Set(existing.map((c) => c.playerId));

    const toCreate = data.playerIds
      .filter((playerId) => !existingPlayerIds.has(playerId))
      .map((playerId) =>
        repository.create({
          teamId,
          matchId: data.matchId,
          playerId,
          notes: data.notes ?? null,
          notifiedAt: new Date(),
        })
      );

    if (toCreate.length === 0) return [];
    return repository.save(toCreate);
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
