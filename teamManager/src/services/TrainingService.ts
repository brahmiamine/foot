import { getDataSource } from "@/lib/database";
import { Training, TrainingIntensity, TrainingStatus, TrainingType } from "@/entities/Training";
import { TrainingBlock } from "@/entities/TrainingBlock";
import { In, Repository } from "typeorm";
import { AgeCategory } from "@/types/categories";
import type { TrainingBlockInput } from "@/types/trainings";

/** Service for Training operations (séances d'entraînement par catégorie, avec déroulé chronométré). */
export class TrainingService {
  private async getRepository(): Promise<Repository<Training>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Training);
  }

  private async getBlockRepository(): Promise<Repository<TrainingBlock>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(TrainingBlock);
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

  async findBlocks(trainingId: number): Promise<TrainingBlock[]> {
    const repository = await this.getBlockRepository();
    return repository.find({ where: { trainingId }, relations: ["tacticsBoard"], order: { displayOrder: "ASC" } });
  }

  async saveBlocks(trainingId: number, blocks: TrainingBlockInput[]): Promise<TrainingBlock[]> {
    const repository = await this.getBlockRepository();
    await repository.delete({ trainingId });
    if (blocks.length === 0) return [];
    const rows = blocks.map((b, index) =>
      repository.create({
        trainingId,
        displayOrder: index,
        blockType: b.blockType,
        label: b.label,
        durationMinutes: b.durationMinutes,
        notes: b.notes ?? null,
        tacticsBoardId: b.tacticsBoardId ?? null,
      })
    );
    return repository.save(rows);
  }

  async create(
    data: {
      category: AgeCategory;
      title: string;
      objective?: string | null;
      trainingType: TrainingType;
      intensity?: TrainingIntensity | null;
      date: Date;
      durationMinutes?: number | null;
      equipment?: string | null;
      stadiumId?: number | null;
      venueName?: string | null;
      notes?: string | null;
      blocks?: TrainingBlockInput[];
    },
    teamId: string,
    createdBy: string
  ): Promise<Training> {
    const repository = await this.getRepository();
    const { blocks, ...trainingData } = data;
    const training = repository.create({ ...trainingData, teamId, createdBy, status: "SCHEDULED" });
    const saved = await repository.save(training);
    if (blocks && blocks.length > 0) {
      await this.saveBlocks(saved.id, blocks);
    }
    return saved;
  }

  async update(
    id: number,
    teamId: string,
    data: Partial<{
      category: AgeCategory;
      title: string;
      objective: string | null;
      trainingType: TrainingType;
      intensity: TrainingIntensity | null;
      date: Date;
      durationMinutes: number | null;
      equipment: string | null;
      stadiumId: number | null;
      venueName: string | null;
      notes: string | null;
      status: TrainingStatus;
      blocks: TrainingBlockInput[];
    }>
  ): Promise<Training> {
    const repository = await this.getRepository();
    const training = await this.findById(id, teamId);
    if (!training) {
      throw new Error("Entraînement non trouvé");
    }
    const { blocks, ...trainingData } = data;
    Object.assign(training, trainingData);
    const saved = await repository.save(training);
    if (blocks !== undefined) {
      await this.saveBlocks(id, blocks);
    }
    return saved;
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
