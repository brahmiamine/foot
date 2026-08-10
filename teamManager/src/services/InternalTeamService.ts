import { getDataSource } from "@/lib/database";
import { InternalTeam, InternalTeamStatus } from "@/entities/InternalTeam";
import { Repository } from "typeorm";
import { AgeCategory } from "@/types/categories";

/**
 * Service for InternalTeam operations — équipes sportives internes du
 * club (ex: "U17 A", "U17 B"), à ne pas confondre avec `teams` (référentiel
 * de clubs partagé).
 */
export class InternalTeamService {
  private async getRepository(): Promise<Repository<InternalTeam>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(InternalTeam);
  }

  async findAll(teamId: string): Promise<InternalTeam[]> {
    const repository = await this.getRepository();
    return repository.find({ where: { teamId }, relations: ["season"], order: { category: "ASC", name: "ASC" } });
  }

  async findById(id: number, teamId: string): Promise<InternalTeam | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id, teamId }, relations: ["season"] });
  }

  async create(
    data: { seasonId?: number | null; name: string; category: AgeCategory; gender?: "male" | "female" | "mixed"; code?: string | null },
    teamId: string
  ): Promise<InternalTeam> {
    const repository = await this.getRepository();
    const squad = repository.create({ ...data, teamId, gender: data.gender ?? "male", status: "ACTIVE" });
    return repository.save(squad);
  }

  async update(
    id: number,
    teamId: string,
    data: Partial<{ seasonId: number | null; name: string; category: AgeCategory; gender: "male" | "female" | "mixed"; code: string | null; status: InternalTeamStatus }>
  ): Promise<InternalTeam> {
    const repository = await this.getRepository();
    const squad = await this.findById(id, teamId);
    if (!squad) {
      throw new Error("Équipe interne non trouvée");
    }
    Object.assign(squad, data);
    return repository.save(squad);
  }

  async delete(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getRepository();
    const squad = await this.findById(id, teamId);
    if (!squad) {
      throw new Error("Équipe interne non trouvée");
    }
    await repository.remove(squad);
    return true;
  }
}
