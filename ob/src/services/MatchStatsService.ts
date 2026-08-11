import { getDataSource } from "@/lib/database";
import { ObMatchStats } from "@/entities/ObMatchStats";

export interface MatchStatsInput {
  matchId: string;
  possessionHome: number | null;
  possessionAway: number | null;
  shotsHome: number | null;
  shotsAway: number | null;
  shotsOnTargetHome: number | null;
  shotsOnTargetAway: number | null;
  cornersHome: number | null;
  cornersAway: number | null;
  foulsHome: number | null;
  foulsAway: number | null;
}

export class MatchStatsService {
  async getForMatch(matchId: string): Promise<ObMatchStats | null> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(ObMatchStats).findOne({ where: { matchId } });
  }

  async getForMatches(matchIds: string[]): Promise<Map<string, ObMatchStats>> {
    if (matchIds.length === 0) return new Map();
    const dataSource = await getDataSource();
    const rows = await dataSource.getRepository(ObMatchStats).find({ where: matchIds.map((matchId) => ({ matchId })) });
    return new Map(rows.map((r) => [r.matchId, r]));
  }

  async upsert(input: MatchStatsInput, updatedBy: string): Promise<void> {
    const dataSource = await getDataSource();
    const repository = dataSource.getRepository(ObMatchStats);
    const existing = await repository.findOne({ where: { matchId: input.matchId } });
    const row = existing ?? repository.create({ matchId: input.matchId });
    Object.assign(row, input, { updatedBy });
    await repository.save(row);
  }
}
