import { MatchLineup, type LineupRole } from "@/entities/MatchLineup";
import { MatchFormation } from "@/entities/MatchFormation";
import { TacticsBoard } from "@/entities/TacticsBoard";
import type { AgeCategory } from "@/types/categories";
import { StaffConvocationService } from "./StaffConvocationService";
import type { CategoryScope } from "./StaffServiceBase";

export class StaffLineupService extends StaffConvocationService {
  async getFormation(
    teamId: string,
    matchType: "OFFICIAL" | "FRIENDLY",
    matchId?: string,
    friendlyMatchId?: number,
  ): Promise<MatchFormation | null> {
    const ds = await this.ds();
    return ds.getRepository(MatchFormation).findOne({
      where:
        matchType === "OFFICIAL"
          ? { teamId, matchType, matchId }
          : { teamId, matchType, friendlyMatchId },
    });
  }

  async setFormation(
    teamId: string,
    matchType: "OFFICIAL" | "FRIENDLY",
    formation: string,
    matchId?: string,
    friendlyMatchId?: number,
  ): Promise<void> {
    const ds = await this.ds();
    const repo = ds.getRepository(MatchFormation);
    let entry = await this.getFormation(teamId, matchType, matchId, friendlyMatchId);
    if (!entry) {
      entry = repo.create({
        teamId,
        matchType,
        matchId: matchId ?? null,
        friendlyMatchId: friendlyMatchId ?? null,
        formation,
      });
    } else {
      entry.formation = formation;
    }
    await repo.save(entry);
  }

  async getLineup(
    teamId: string,
    matchType: "OFFICIAL" | "FRIENDLY",
    matchId?: string,
    friendlyMatchId?: number,
  ): Promise<MatchLineup[]> {
    const ds = await this.ds();
    return ds.getRepository(MatchLineup).find({
      where:
        matchType === "OFFICIAL"
          ? { teamId, matchType, matchId }
          : { teamId, matchType, friendlyMatchId },
    });
  }

  async setLineupEntry(
    teamId: string,
    matchType: "OFFICIAL" | "FRIENDLY",
    playerId: string,
    role: LineupRole,
    options: {
      matchId?: string;
      friendlyMatchId?: number;
      shirtNumber?: number | null;
      position?: string | null;
      isCaptain?: boolean;
    },
  ): Promise<void> {
    const ds = await this.ds();
    const repo = ds.getRepository(MatchLineup);
    const where =
      matchType === "OFFICIAL"
        ? { teamId, matchType, matchId: options.matchId, playerId }
        : { teamId, matchType, friendlyMatchId: options.friendlyMatchId, playerId };
    let entry = await repo.findOne({ where });
    if (!entry) {
      entry = repo.create({
        teamId,
        matchType,
        matchId: options.matchId ?? null,
        friendlyMatchId: options.friendlyMatchId ?? null,
        playerId,
      });
    }
    entry.role = role;
    entry.shirtNumber = options.shirtNumber ?? null;
    entry.position = options.position ?? null;
    entry.isCaptain = options.isCaptain ?? false;
    await repo.save(entry);
  }

  async removeLineupEntry(id: number, teamId: string): Promise<void> {
    const ds = await this.ds();
    const repo = ds.getRepository(MatchLineup);
    const entry = await repo.findOne({ where: { id, teamId } });
    if (entry) await repo.remove(entry);
  }

  async listTacticsBoards(teamId: string, categories: CategoryScope): Promise<TacticsBoard[]> {
    const ds = await this.ds();
    const boards = await ds.getRepository(TacticsBoard).find({
      where: { teamId },
      order: { createdAt: "DESC" },
    });
    if (categories === "ALL") return boards;
    return boards.filter((board) => !board.category || categories.includes(board.category as AgeCategory));
  }
}
