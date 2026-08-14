import { randomUUID } from "node:crypto";
import { getDataSource } from "@/lib/database";
import { Fine, type FineStatus, type FineType } from "@/entities/Fine";
import { Player } from "@/entities/Player";
import { Suspension } from "@/entities/Suspension";
import { Repository } from "typeorm";

export interface CreateFineInput {
  type: FineType;
  amount: number;
  reasonFr: string;
  reasonAr?: string | null;
  playerId?: string | null;
  directorNameFr?: string | null;
  directorNameAr?: string | null;
  dueDate?: string | null;
}

export interface UpdateFineInput {
  status?: FineStatus;
  paidAt?: string | null;
  amount?: number;
  reasonFr?: string;
  reasonAr?: string | null;
  dueDate?: string;
}

/**
 * Service for Fine operations (amendes disciplinaires) — port de
 * cardManager/app/api/fines.
 */
export class FineService {
  private async getRepository(): Promise<Repository<Fine>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Fine);
  }

  async findAllByTeam(teamId: string, type?: FineType): Promise<Fine[]> {
    const repository = await this.getRepository();
    return repository.find({
      where: { teamId, ...(type ? { type } : {}) },
      relations: { player: true },
      order: { createdAt: "DESC" },
    });
  }

  async findById(id: string, teamId: string): Promise<Fine | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id, teamId } });
  }

  /** Amende OVERDUE en cours pour ce joueur — bloque la réactivation après suspension purgée. */
  async hasOverdue(playerId: string): Promise<boolean> {
    const repository = await this.getRepository();
    const count = await repository.count({ where: { playerId, status: "OVERDUE" } });
    return count > 0;
  }

  /**
   * Crée une amende. `teamId` doit avoir déjà été vérifié par l'appelant
   * (dérivé du joueur pour une amende carton, ou de la session sinon).
   */
  async create(data: CreateFineInput, teamId: string | null): Promise<Fine> {
    const repository = await this.getRepository();
    const fine = repository.create({
      id: randomUUID(),
      type: data.type,
      amount: String(data.amount),
      reasonFr: data.reasonFr,
      reasonAr: data.reasonAr ?? null,
      playerId: data.playerId ?? null,
      directorNameFr: data.directorNameFr ?? null,
      directorNameAr: data.directorNameAr ?? null,
      teamId,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    });
    return repository.save(fine);
  }

  async update(id: string, teamId: string, data: UpdateFineInput): Promise<{ before: Fine; after: Fine }> {
    const dataSource = await getDataSource();
    const repository = await this.getRepository();
    const playerRepo = dataSource.getRepository(Player);
    const suspensionRepo = dataSource.getRepository(Suspension);

    const before = await this.findById(id, teamId);
    if (!before) throw new Error("Amende non trouvée");
    const beforeSnapshot = { ...before } as Fine;

    if (data.status !== undefined) before.status = data.status;
    if (data.paidAt !== undefined) before.paidAt = data.paidAt ? new Date(data.paidAt) : null;
    if (data.amount !== undefined) before.amount = String(data.amount);
    if (data.reasonFr !== undefined) before.reasonFr = data.reasonFr;
    if (data.reasonAr !== undefined) before.reasonAr = data.reasonAr;
    if (data.dueDate !== undefined) before.dueDate = new Date(data.dueDate);

    const after = await repository.save(before);

    // Déblocage du joueur quand l'amende passe PAID — uniquement si plus de
    // suspension active ni d'autre amende OVERDUE (règlement FTF).
    if (data.status === "PAID" && after.playerId) {
      const remainingActiveSuspensions = await suspensionRepo.count({
        where: { playerId: after.playerId, status: "ACTIVE" },
      });
      const remainingOverdueFines = await repository
        .createQueryBuilder("fine")
        .where("fine.playerId = :playerId", { playerId: after.playerId })
        .andWhere("fine.status = 'OVERDUE'")
        .andWhere("fine.id != :id", { id })
        .getCount();

      if (remainingActiveSuspensions === 0 && remainingOverdueFines === 0) {
        const player = await playerRepo.findOne({ where: { id: after.playerId } });
        if (player?.status === "SUSPENDED") {
          player.status = "BLANK";
          await playerRepo.save(player);
        }
      }
    }

    return { before: beforeSnapshot, after };
  }

  async delete(id: string, teamId: string): Promise<Fine> {
    const repository = await this.getRepository();
    const fine = await this.findById(id, teamId);
    if (!fine) throw new Error("Amende non trouvée");
    await repository.remove(fine);
    return fine;
  }

  /** Passe les amendes PENDING en OVERDUE une fois l'échéance dépassée. */
  async markOverdue(): Promise<number> {
    const repository = await this.getRepository();
    const result = await repository
      .createQueryBuilder()
      .update(Fine)
      .set({ status: "OVERDUE" })
      .where("status = 'PENDING'")
      .andWhere("dueDate < :now", { now: new Date() })
      .execute();
    return result.affected ?? 0;
  }
}
