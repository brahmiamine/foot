import { getDataSource } from "@/lib/database";
import { Injury, InjuryAvailability, InjuryStatus } from "@/entities/Injury";
import { Repository } from "typeorm";
import { AgeCategory } from "@/types/categories";
import type { CreateInjuryInput, InjuryDocument, UpdateInjuryInput } from "@/types/injuries";

/**
 * Service for Injury operations — dossiers de blessure des joueurs, module
 * à accès strictement restreint (voir permission "medical.*").
 */
export class InjuryService {
  private async getRepository(): Promise<Repository<Injury>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Injury);
  }

  /** Toutes les blessures des joueurs des catégories autorisées. */
  async findAll(teamId: string, categories?: "ALL" | AgeCategory[]): Promise<Injury[]> {
    const repository = await this.getRepository();
    const qb = repository
      .createQueryBuilder("injury")
      .leftJoinAndSelect("injury.player", "player")
      .where("injury.teamId = :teamId", { teamId })
      .orderBy("injury.injuryDate", "DESC");

    if (categories && categories !== "ALL") {
      if (categories.length === 0) return [];
      qb.andWhere("player.category IN (:...categories)", { categories });
    }
    return qb.getMany();
  }

  async findByPlayer(playerId: string, teamId: string): Promise<Injury[]> {
    const repository = await this.getRepository();
    return repository.find({ where: { playerId, teamId }, order: { injuryDate: "DESC" } });
  }

  async findById(id: number, teamId: string): Promise<Injury | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id, teamId }, relations: ["player"] });
  }

  async create(data: CreateInjuryInput, teamId: string, createdBy: string): Promise<Injury> {
    const repository = await this.getRepository();
    const injury = repository.create({
      teamId,
      playerId: data.playerId,
      injuryDate: data.injuryDate,
      zone: data.zone,
      severity: data.severity,
      description: data.description ?? null,
      diagnosis: data.diagnosis ?? null,
      unavailabilityDays: data.unavailabilityDays ?? null,
      expectedReturnDate: data.expectedReturnDate || null,
      actualReturnDate: data.actualReturnDate || null,
      progressiveReturn: data.progressiveReturn,
      progressiveReturnNotes: data.progressiveReturnNotes ?? null,
      documents: JSON.stringify(data.documents ?? []),
      status: data.status,
      availabilityStatus: data.availabilityStatus,
      notes: data.notes ?? null,
      createdBy,
    });
    return repository.save(injury);
  }

  async update(id: number, teamId: string, data: UpdateInjuryInput): Promise<Injury> {
    const repository = await this.getRepository();
    const injury = await this.findById(id, teamId);
    if (!injury) {
      throw new Error("Dossier de blessure non trouvé");
    }

    if (data.injuryDate !== undefined) injury.injuryDate = data.injuryDate;
    if (data.zone !== undefined) injury.zone = data.zone;
    if (data.severity !== undefined) injury.severity = data.severity;
    if (data.description !== undefined) injury.description = data.description;
    if (data.diagnosis !== undefined) injury.diagnosis = data.diagnosis;
    if (data.unavailabilityDays !== undefined) injury.unavailabilityDays = data.unavailabilityDays;
    if (data.expectedReturnDate !== undefined) injury.expectedReturnDate = data.expectedReturnDate || null;
    if (data.actualReturnDate !== undefined) injury.actualReturnDate = data.actualReturnDate || null;
    if (data.progressiveReturn !== undefined) injury.progressiveReturn = data.progressiveReturn;
    if (data.progressiveReturnNotes !== undefined) injury.progressiveReturnNotes = data.progressiveReturnNotes;
    if (data.documents !== undefined) injury.documents = JSON.stringify(data.documents);
    if (data.status !== undefined) injury.status = data.status as InjuryStatus;
    if (data.availabilityStatus !== undefined) injury.availabilityStatus = data.availabilityStatus as InjuryAvailability;
    if (data.notes !== undefined) injury.notes = data.notes;

    return repository.save(injury);
  }

  async delete(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getRepository();
    const injury = await this.findById(id, teamId);
    if (!injury) {
      throw new Error("Dossier de blessure non trouvé");
    }
    await repository.remove(injury);
    return true;
  }

  static parseDocuments(injury: Injury): InjuryDocument[] {
    try {
      const parsed = JSON.parse(injury.documents ?? "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
