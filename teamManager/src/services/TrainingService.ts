import { getDataSource } from "@/lib/database";
import { Training, TrainingStatus, TrainingType } from "@/entities/Training";
import { In, Repository } from "typeorm";
import { AgeCategory } from "@/types/categories";

/** Service for Training operations (séances d'entraînement par catégorie). */
export class TrainingService {
  private async getRepository(): Promise<Repository<Training>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Training);
  }

  async findAll(teamId: string, categories?: "ALL" | AgeCategory[]): Promise<Training[]> {
    const repository = await this.getRepository();
    const where =
      categories && categories !== "ALL"
        ? categories.length === 0
          ? null
          : { teamId, category: In(categories) }
        : { teamId };
    if (!where) return [];
    return repository.find({ where, relations: ["stadium"], order: { date: "DESC" } });
  }

  async findById(id: number, teamId: string): Promise<Training | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id, teamId }, relations: ["stadium"] });
  }

  async create(
    data: {
      category: AgeCategory;
      title: string;
      trainingType: TrainingType;
      date: Date;
      durationMinutes?: number | null;
      stadiumId?: number | null;
      venueName?: string | null;
      notes?: string | null;
    },
    teamId: string,
    createdBy: string
  ): Promise<Training> {
    const repository = await this.getRepository();
    const training = repository.create({ ...data, teamId, createdBy, status: "SCHEDULED" });
    return repository.save(training);
  }

  async update(
    id: number,
    teamId: string,
    data: Partial<{
      category: AgeCategory;
      title: string;
      trainingType: TrainingType;
      date: Date;
      durationMinutes: number | null;
      stadiumId: number | null;
      venueName: string | null;
      notes: string | null;
      status: TrainingStatus;
    }>
  ): Promise<Training> {
    const repository = await this.getRepository();
    const training = await this.findById(id, teamId);
    if (!training) {
      throw new Error("Entraînement non trouvé");
    }
    Object.assign(training, data);
    return repository.save(training);
  }

  async delete(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getRepository();
    const training = await this.findById(id, teamId);
    if (!training) {
      throw new Error("Entraînement non trouvé");
    }
    await repository.remove(training);
    return true;
  }
}
