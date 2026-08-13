import { getDataSource } from "@/lib/db";
import { Injury } from "@/entities/Injury";
import { MatchPeriod } from "@/entities/Card";
import { Repository } from "typeorm";
import { assertSheetEditable } from "./sheetGuard";
import { isDuplicateKeyError } from "@/lib/dbErrors";

interface CreateInjuryInput {
  sheetId: number;
  matchId: string;
  teamId: string;
  playerId?: string | null;
  minute?: number | null;
  period?: MatchPeriod | null;
  description?: string | null;
  requiresSubstitution?: boolean;
  /** TASK-P0-025 : voir Goal.clientRequestId — un doublon renvoie l'événement déjà créé, sans erreur. */
  clientRequestId?: string | null;
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
      clientRequestId: data.clientRequestId ?? null,
    });
    try {
      return await repository.save(injury);
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
