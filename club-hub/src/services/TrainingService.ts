import { getDataSource } from "@/lib/database";
import { Training, type TrainingIntensity, type TrainingStatus, type TrainingType } from "@/entities/Training";
import { TrainingBlock } from "@/entities/TrainingBlock";
import { TrainingTemplate } from "@/entities/TrainingTemplate";
import { In, type EntityManager, type Repository } from "typeorm";
import type { AgeCategory } from "@/types/categories";
import type { TrainingBlockInput } from "@/types/trainings";

export function validateTrainingResponsePolicy(
  trainingDate: Date,
  responseDeadline: Date | null | undefined,
  reminderOffsetMinutes: number,
): void {
  if (Number.isNaN(trainingDate.getTime())) throw new Error("Date de séance invalide");
  if (!Number.isInteger(reminderOffsetMinutes) || reminderOffsetMinutes < 0 || reminderOffsetMinutes > 10080) {
    throw new Error("Délai de rappel invalide");
  }
  if (responseDeadline) {
    if (Number.isNaN(responseDeadline.getTime())) throw new Error("Deadline de réponse invalide");
    if (responseDeadline.getTime() > trainingDate.getTime()) {
      throw new Error("La deadline de réponse doit précéder la séance");
    }
  }
}

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

  async findBlocksByTrainingIds(trainingIds: number[]): Promise<TrainingBlock[]> {
    if (trainingIds.length === 0) return [];
    const repository = await this.getBlockRepository();
    return repository.find({
      where: { trainingId: In(trainingIds) },
      relations: ["tacticsBoard"],
      order: { trainingId: "ASC", displayOrder: "ASC" },
    });
  }

  async findTemplates(teamId: string, categories?: "ALL" | AgeCategory[]): Promise<TrainingTemplate[]> {
    const ds = await getDataSource();
    const where =
      categories && categories !== "ALL"
        ? categories.length === 0
          ? null
          : { teamId, category: In(categories) }
        : { teamId };
    if (!where) return [];
    return ds.getRepository(TrainingTemplate).find({ where, order: { updatedAt: "DESC" } });
  }

  private async saveBlocksWithManager(
    manager: EntityManager,
    trainingId: number,
    blocks: TrainingBlockInput[],
  ): Promise<TrainingBlock[]> {
    const repository = manager.getRepository(TrainingBlock);
    await repository.delete({ trainingId });
    if (blocks.length === 0) return [];
    const rows = blocks.map((block, index) =>
      repository.create({
        trainingId,
        displayOrder: index,
        blockType: block.blockType,
        label: block.label,
        durationMinutes: block.durationMinutes,
        notes: block.notes ?? null,
        tacticsBoardId: block.tacticsBoardId ?? null,
      }),
    );
    return repository.save(rows);
  }

  async saveBlocks(trainingId: number, blocks: TrainingBlockInput[]): Promise<TrainingBlock[]> {
    const ds = await getDataSource();
    return ds.transaction((manager) => this.saveBlocksWithManager(manager, trainingId, blocks));
  }

  async create(
    data: {
      category: AgeCategory;
      title: string;
      objective?: string | null;
      trainingType: TrainingType;
      intensity?: TrainingIntensity | null;
      date: Date;
      responseDeadline?: Date | null;
      reminderOffsetMinutes?: number;
      durationMinutes?: number | null;
      equipment?: string | null;
      stadiumId?: number | null;
      venueName?: string | null;
      notes?: string | null;
      blocks?: TrainingBlockInput[];
    },
    teamId: string,
    createdBy: string,
  ): Promise<Training> {
    const reminderOffsetMinutes = data.reminderOffsetMinutes ?? 1440;
    validateTrainingResponsePolicy(data.date, data.responseDeadline, reminderOffsetMinutes);
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const repository = manager.getRepository(Training);
      const { blocks, ...trainingData } = data;
      const training = repository.create({
        ...trainingData,
        responseDeadline: data.responseDeadline ?? null,
        reminderOffsetMinutes,
        invitationsLocked: false,
        invitationsLockedAt: null,
        invitationsLockedBy: null,
        teamId,
        createdBy,
        status: "SCHEDULED",
      });
      const saved = await repository.save(training);
      if (blocks?.length) await this.saveBlocksWithManager(manager, saved.id, blocks);
      return saved;
    });
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
      responseDeadline: Date | null;
      reminderOffsetMinutes: number;
      durationMinutes: number | null;
      equipment: string | null;
      stadiumId: number | null;
      venueName: string | null;
      notes: string | null;
      status: TrainingStatus;
      blocks: TrainingBlockInput[];
    }>,
  ): Promise<Training> {
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const repository = manager.getRepository(Training);
      const training = await repository.findOne({ where: { id, teamId }, lock: { mode: "pessimistic_write" } });
      if (!training) throw new Error("Entraînement non trouvé");

      const { blocks, ...trainingData } = data;
      const nextDate = trainingData.date ?? training.date;
      const nextDeadline = trainingData.responseDeadline !== undefined ? trainingData.responseDeadline : training.responseDeadline;
      const nextReminder = trainingData.reminderOffsetMinutes ?? training.reminderOffsetMinutes ?? 1440;
      validateTrainingResponsePolicy(nextDate, nextDeadline, nextReminder);
      Object.assign(training, trainingData);
      const saved = await repository.save(training);
      if (blocks !== undefined) await this.saveBlocksWithManager(manager, id, blocks);
      return saved;
    });
  }

  async updateResponsePolicy(
    id: number,
    teamId: string,
    input: { responseDeadline: Date | null; reminderOffsetMinutes: number },
  ): Promise<Training> {
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const repo = manager.getRepository(Training);
      const training = await repo.findOne({ where: { id, teamId }, lock: { mode: "pessimistic_write" } });
      if (!training) throw new Error("Entraînement non trouvé");
      if (training.status !== "SCHEDULED") throw new Error("La politique de réponse n'est modifiable que sur une séance planifiée");
      if (training.invitationsLocked) throw new Error("Le roster est verrouillé : la politique de réponse est figée");
      validateTrainingResponsePolicy(training.date, input.responseDeadline, input.reminderOffsetMinutes);
      training.responseDeadline = input.responseDeadline;
      training.reminderOffsetMinutes = input.reminderOffsetMinutes;
      return repo.save(training);
    });
  }

  async lockInvitations(id: number, teamId: string, actorUserId: string): Promise<Training> {
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const repo = manager.getRepository(Training);
      const training = await repo.findOne({ where: { id, teamId }, lock: { mode: "pessimistic_write" } });
      if (!training) throw new Error("Entraînement non trouvé");
      if (training.status !== "SCHEDULED") throw new Error("Seule une séance planifiée peut verrouiller ses invitations");
      if (training.invitationsLocked) return training;
      training.invitationsLocked = true;
      training.invitationsLockedAt = new Date();
      training.invitationsLockedBy = actorUserId;
      return repo.save(training);
    });
  }

  async createTemplateFromTraining(
    trainingId: number,
    teamId: string,
    name: string,
    actorUserId: string,
  ): Promise<TrainingTemplate> {
    const normalizedName = name.trim();
    if (normalizedName.length < 2 || normalizedName.length > 120) throw new Error("Nom du modèle invalide");
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const training = await manager.getRepository(Training).findOne({ where: { id: trainingId, teamId } });
      if (!training) throw new Error("Entraînement non trouvé");
      const blocks = await manager.getRepository(TrainingBlock).find({
        where: { trainingId },
        order: { displayOrder: "ASC" },
      });
      const responseDeadlineOffsetMinutes = training.responseDeadline
        ? Math.max(0, Math.round((training.date.getTime() - training.responseDeadline.getTime()) / 60_000))
        : 1440;
      const repo = manager.getRepository(TrainingTemplate);
      return repo.save(repo.create({
        teamId,
        category: training.category,
        name: normalizedName,
        title: training.title,
        objective: training.objective ?? null,
        trainingType: training.trainingType,
        intensity: training.intensity ?? null,
        durationMinutes: training.durationMinutes ?? null,
        equipment: training.equipment ?? null,
        venueName: training.venueName ?? null,
        notes: training.notes ?? null,
        responseDeadlineOffsetMinutes,
        reminderOffsetMinutes: training.reminderOffsetMinutes ?? 1440,
        blocks: blocks.map((block) => ({
          blockType: block.blockType,
          label: block.label,
          durationMinutes: block.durationMinutes,
          notes: block.notes ?? null,
          tacticsBoardId: block.tacticsBoardId ?? null,
        })),
        createdBy: actorUserId,
      }));
    });
  }

  async createFromTemplate(templateId: number, teamId: string, date: Date, actorUserId: string): Promise<Training> {
    if (Number.isNaN(date.getTime())) throw new Error("Date de séance invalide");
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const template = await manager.getRepository(TrainingTemplate).findOne({ where: { id: templateId, teamId } });
      if (!template) throw new Error("Modèle d'entraînement non trouvé");
      const responseDeadline = new Date(date.getTime() - template.responseDeadlineOffsetMinutes * 60_000);
      validateTrainingResponsePolicy(date, responseDeadline, template.reminderOffsetMinutes);
      const repo = manager.getRepository(Training);
      const training = await repo.save(repo.create({
        teamId,
        category: template.category,
        title: template.title,
        objective: template.objective ?? null,
        trainingType: template.trainingType,
        intensity: template.intensity ?? null,
        date,
        responseDeadline,
        reminderOffsetMinutes: template.reminderOffsetMinutes,
        durationMinutes: template.durationMinutes ?? null,
        equipment: template.equipment ?? null,
        stadiumId: null,
        venueName: template.venueName ?? null,
        notes: template.notes ?? null,
        status: "SCHEDULED",
        invitationsLocked: false,
        invitationsLockedAt: null,
        invitationsLockedBy: null,
        createdBy: actorUserId,
      }));
      await this.saveBlocksWithManager(manager, training.id, template.blocks ?? []);
      return training;
    });
  }

  async deleteTemplate(id: number, teamId: string): Promise<void> {
    const ds = await getDataSource();
    const repo = ds.getRepository(TrainingTemplate);
    const template = await repo.findOne({ where: { id, teamId } });
    if (!template) throw new Error("Modèle d'entraînement non trouvé");
    await repo.remove(template);
  }

  async delete(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getRepository();
    const training = await this.findById(id, teamId);
    if (!training) throw new Error("Entraînement non trouvé");
    await repository.remove(training);
    return true;
  }
}
