import { getDataSource } from "@/lib/db";
import { Goal } from "@/entities/Goal";
import { MatchPeriod } from "@/entities/Card";
import { Repository } from "typeorm";
import { assertSheetEditable } from "./sheetGuard";
import { isDuplicateKeyError } from "@/lib/dbErrors";

interface CreateGoalInput {
  sheetId: number;
  matchId: string;
  teamId: string;
  playerId?: string | null;
  minute: number;
  period: MatchPeriod;
  isOwnGoal?: boolean;
  isPenalty?: boolean;
  /** TASK-P0-025 : voir Goal.clientRequestId — un doublon renvoie l'événement déjà créé, sans erreur. */
  clientRequestId?: string | null;
}

export class GoalService {
  private async getRepository(): Promise<Repository<Goal>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Goal);
  }

  async findBySheet(sheetId: number): Promise<Goal[]> {
    const repository = await this.getRepository();
    return repository.find({ where: { sheetId }, relations: ["player", "team"], order: { minute: "ASC" } });
  }

  async create(data: CreateGoalInput): Promise<Goal> {
    await assertSheetEditable(data.sheetId);
    const repository = await this.getRepository();
    const goal = repository.create({
      sheetId: data.sheetId,
      matchId: data.matchId,
      teamId: data.teamId,
      playerId: data.playerId ?? null,
      minute: data.minute,
      period: data.period,
      isOwnGoal: data.isOwnGoal ?? false,
      isPenalty: data.isPenalty ?? false,
      clientRequestId: data.clientRequestId ?? null,
    });
    try {
      return await repository.save(goal);
    } catch (error) {
      if (data.clientRequestId && isDuplicateKeyError(error)) {
        const existing = await repository.findOne({
          where: { sheetId: data.sheetId, clientRequestId: data.clientRequestId },
        });
        if (existing) return existing;
      }
      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    const repository = await this.getRepository();
    await repository.delete({ id });
  }
}
