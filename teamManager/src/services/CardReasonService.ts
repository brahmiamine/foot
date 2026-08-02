import { randomUUID } from "node:crypto";
import { getDataSource } from "@/lib/database";
import { CardReason } from "@/entities/CardReason";
import { Repository } from "typeorm";

/**
 * Service for CardReason operations — motifs de carton, communs à tous les
 * clubs (pas de scoping par équipe).
 */
export class CardReasonService {
  private async getRepository(): Promise<Repository<CardReason>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(CardReason);
  }

  async findAll(): Promise<CardReason[]> {
    const repository = await this.getRepository();
    return repository.find({ order: { type: "ASC", labelFr: "ASC" } });
  }

  async findActive(): Promise<CardReason[]> {
    const repository = await this.getRepository();
    return repository.find({ where: { isActive: true }, order: { type: "ASC", labelFr: "ASC" } });
  }

  async findById(id: string): Promise<CardReason | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id } });
  }

  async create(data: { labelFr: string; labelAr?: string | null; type?: "YELLOW" | "RED" | "BOTH"; isActive?: boolean }): Promise<CardReason> {
    const repository = await this.getRepository();
    const reason = repository.create({
      id: randomUUID(),
      labelFr: data.labelFr,
      labelAr: data.labelAr ?? null,
      type: data.type ?? "BOTH",
      isActive: data.isActive ?? true,
    });
    return repository.save(reason);
  }

  async update(
    id: string,
    data: { labelFr?: string; labelAr?: string | null; type?: "YELLOW" | "RED" | "BOTH"; isActive?: boolean }
  ): Promise<CardReason> {
    const repository = await this.getRepository();
    const reason = await this.findById(id);
    if (!reason) throw new Error("Motif non trouvé");

    Object.assign(reason, data);
    return repository.save(reason);
  }

  async delete(id: string): Promise<boolean> {
    const repository = await this.getRepository();
    const reason = await this.findById(id);
    if (!reason) throw new Error("Motif non trouvé");

    await repository.remove(reason);
    return true;
  }
}
