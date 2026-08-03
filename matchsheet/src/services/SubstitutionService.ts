import { getDataSource } from "@/lib/db";
import { Substitution } from "@/entities/Substitution";
import { MatchPeriod } from "@/entities/Card";
import { Repository } from "typeorm";

interface CreateSubstitutionInput {
  sheetId: number;
  matchId: string;
  teamId: string;
  playerOutId: string;
  playerInId: string;
  minute: number;
  period: MatchPeriod;
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
    const repository = await this.getRepository();
    const substitution = repository.create(data);
    return repository.save(substitution);
  }

  async delete(id: number): Promise<void> {
    const repository = await this.getRepository();
    await repository.delete({ id });
  }
}
