import { getDataSource } from "@/lib/db";
import { Injury } from "@/entities/Injury";
import { MatchPeriod } from "@/entities/Card";
import { Repository } from "typeorm";
import { assertSheetEditable } from "./sheetGuard";

interface CreateInjuryInput {
  sheetId: number;
  matchId: string;
  teamId: string;
  playerId?: string | null;
  minute?: number | null;
  period?: MatchPeriod | null;
  description?: string | null;
  requiresSubstitution?: boolean;
}

export class InjuryService {
  private async getRepository(): Promise<Repository<Injury>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Injury);
  }

  async findBySheet(sheetId: number): Promise<Injury[]> {
    const repository = await this.getRepository();
    return repository.find({ where: { sheetId }, relations: ["player", "team"], order: { createdAt: "ASC" } });
  }

  async create(data: CreateInjuryInput): Promise<Injury> {
    await assertSheetEditable(data.sheetId);
    const repository = await this.getRepository();
    const injury = repository.create({
      sheetId: data.sheetId,
      matchId: data.matchId,
      teamId: data.teamId,
      playerId: data.playerId ?? null,
      minute: data.minute ?? null,
      period: data.period ?? null,
      description: data.description ?? null,
      requiresSubstitution: data.requiresSubstitution ?? false,
    });
    return repository.save(injury);
  }

  async delete(id: number): Promise<void> {
    const repository = await this.getRepository();
    await repository.delete({ id });
  }
}
