import { Convocation } from "@/entities/Convocation";
import { FriendlyMatch } from "@/entities/FriendlyMatch";
import { StaffTrainingService } from "./StaffTrainingService";
import type { MatchInfo } from "./StaffServiceBase";

export class StaffConvocationService extends StaffTrainingService {
  async listConvocations(teamId: string): Promise<Convocation[]> {
    const ds = await this.ds();
    return ds.getRepository(Convocation).find({
      where: { teamId },
      order: { createdAt: "DESC" },
    });
  }

  async resolveConvocationMatch(convocation: Convocation): Promise<MatchInfo | null> {
    if (convocation.matchType === "FRIENDLY" && convocation.friendlyMatchId) {
      const ds = await this.ds();
      const match = await ds.getRepository(FriendlyMatch).findOne({
        where: { id: convocation.friendlyMatchId },
      });
      if (!match) return null;
      return {
        kind: "FRIENDLY",
        id: String(match.id),
        date: match.date,
        opponentName: match.opponentName ?? "Adversaire",
        isHome: match.isHome,
        status: match.status,
      };
    }
    if (convocation.matchId) return this.resolveMatch(convocation.teamId, convocation.matchId);
    return null;
  }

  async getConvocationsForMatch(
    teamId: string,
    matchType: "OFFICIAL" | "FRIENDLY",
    matchId?: string,
    friendlyMatchId?: number,
  ): Promise<Convocation[]> {
    const ds = await this.ds();
    return ds.getRepository(Convocation).find({
      where:
        matchType === "OFFICIAL"
          ? { teamId, matchType, matchId }
          : { teamId, matchType, friendlyMatchId },
    });
  }

  async createConvocations(
    teamId: string,
    matchType: "OFFICIAL" | "FRIENDLY",
    playerIds: string[],
    matchId?: string,
    friendlyMatchId?: number,
  ): Promise<number> {
    const ds = await this.ds();
    const existing = await this.getConvocationsForMatch(teamId, matchType, matchId, friendlyMatchId);
    const already = new Set(existing.map((convocation) => convocation.playerId));
    const repo = ds.getRepository(Convocation);
    const toCreate = playerIds
      .filter((playerId) => !already.has(playerId))
      .map((playerId) =>
        repo.create({
          teamId,
          matchType,
          matchId: matchType === "OFFICIAL" ? matchId ?? null : null,
          friendlyMatchId: matchType === "FRIENDLY" ? friendlyMatchId ?? null : null,
          playerId,
          response: "PENDING",
          notifiedAt: new Date(),
        }),
      );

    if (toCreate.length > 0) await repo.save(toCreate);
    return toCreate.length;
  }
}
