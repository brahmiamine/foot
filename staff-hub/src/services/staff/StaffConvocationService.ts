import { In } from "typeorm";
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

  async resolveConvocationMatches(convocations: Convocation[]): Promise<Map<number, MatchInfo | null>> {
    const result = new Map<number, MatchInfo | null>();
    if (convocations.length === 0) return result;

    const teamId = convocations[0].teamId;
    const officialIds = [
      ...new Set(
        convocations
          .filter((convocation) => convocation.matchType !== "FRIENDLY" && convocation.matchId)
          .map((convocation) => convocation.matchId as string),
      ),
    ];
    const friendlyIds = [
      ...new Set(
        convocations
          .filter((convocation) => convocation.matchType === "FRIENDLY" && convocation.friendlyMatchId)
          .map((convocation) => convocation.friendlyMatchId as number),
      ),
    ];

    const ds = await this.ds();
    const [officialById, friendlyMatches] = await Promise.all([
      this.resolveMatchesByIds(teamId, officialIds),
      friendlyIds.length
        ? ds.getRepository(FriendlyMatch).find({ where: { id: In(friendlyIds) } })
        : Promise.resolve([] as FriendlyMatch[]),
    ]);
    const friendlyById = new Map(friendlyMatches.map((match) => [Number(match.id), match]));

    for (const convocation of convocations) {
      if (convocation.matchType === "FRIENDLY" && convocation.friendlyMatchId) {
        const match = friendlyById.get(Number(convocation.friendlyMatchId));
        result.set(
          convocation.id,
          match
            ? {
                kind: "FRIENDLY",
                id: String(match.id),
                date: match.date,
                opponentName: match.opponentName ?? "Adversaire",
                isHome: match.isHome,
                status: match.status,
              }
            : null,
        );
        continue;
      }

      result.set(convocation.id, convocation.matchId ? (officialById.get(convocation.matchId) ?? null) : null);
    }

    return result;
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
