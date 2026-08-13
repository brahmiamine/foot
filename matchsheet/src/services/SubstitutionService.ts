import { getDataSource } from "@/lib/db";
import { Substitution } from "@/entities/Substitution";
import { MatchPeriod } from "@/entities/Card";
import { Repository } from "typeorm";
import { assertSheetEditable } from "./sheetGuard";
import { isDuplicateKeyError } from "@/lib/dbErrors";

interface CreateSubstitutionInput {
  sheetId: number;
  matchId: string;
  teamId: string;
  playerOutId: string;
  playerInId: string;
  minute: number;
  period: MatchPeriod;
  /** TASK-P0-025 : voir Goal.clientRequestId — un doublon renvoie l'événement déjà créé, sans erreur. */
  clientRequestId?: string | null;
}

export class SubstitutionService {
  private async getRepository(): Promise<Repository<Substitution>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Substitution);
  }

  async findBySheet(sheetId: number): Promise<Substitution[]> {
    const repository = await this.getRepository();
    return repository.find({ where: { sheetId }, relations: ["playerOut", "playerIn", "team"], order: { minute: "ASC" } });
  }

  async create(data: CreateSubstitutionInput): Promise<Substitution> {
    await assertSheetEditable(data.sheetId);
    const repository = await this.getRepository();
    const substitution = repository.create({ ...data, clientRequestId: data.clientRequestId ?? null });
    try {
      return await repository.save(substitution);
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
