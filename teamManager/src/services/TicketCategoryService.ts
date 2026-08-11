import { getDataSource } from "@/lib/database";
import { TicketCategory } from "@/entities/TicketCategory";
import { TicketingEventCategory } from "@/entities/TicketingEventCategory";
import { Repository } from "typeorm";
import type { CreateTicketCategoryInput, UpdateTicketCategoryInput } from "@/types/ticketing";

/**
 * Service for TicketCategory operations — catalogue de catégories de
 * billets du club (Gradin, Chaise, VIP...), dynamique et réutilisable
 * d'une billetterie à l'autre (voir TicketingEventService pour les quotas).
 */
export class TicketCategoryService {
  private async getRepository(): Promise<Repository<TicketCategory>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(TicketCategory);
  }

  async findAll(teamId: string): Promise<TicketCategory[]> {
    const repository = await this.getRepository();
    return repository.find({ where: { teamId }, order: { displayOrder: "ASC", id: "ASC" } });
  }

  async findActive(teamId: string): Promise<TicketCategory[]> {
    const repository = await this.getRepository();
    return repository.find({ where: { teamId, isActive: true }, order: { displayOrder: "ASC", id: "ASC" } });
  }

  async findById(id: number, teamId: string): Promise<TicketCategory | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id, teamId } });
  }

  async create(data: CreateTicketCategoryInput, teamId: string): Promise<TicketCategory> {
    const repository = await this.getRepository();
    const category = repository.create({
      teamId,
      name: data.name,
      nameAr: data.nameAr ?? null,
      description: data.description ?? null,
      price: String(data.price),
      color: data.color ?? null,
      isActive: data.isActive,
      displayOrder: data.displayOrder,
    });
    return repository.save(category);
  }

  async update(id: number, teamId: string, data: UpdateTicketCategoryInput): Promise<TicketCategory> {
    const repository = await this.getRepository();
    const category = await this.findById(id, teamId);
    if (!category) {
      throw new Error("Catégorie de billet non trouvée");
    }
    if (data.name !== undefined) category.name = data.name;
    if (data.nameAr !== undefined) category.nameAr = data.nameAr;
    if (data.description !== undefined) category.description = data.description;
    if (data.price !== undefined) category.price = String(data.price);
    if (data.color !== undefined) category.color = data.color;
    if (data.isActive !== undefined) category.isActive = data.isActive;
    if (data.displayOrder !== undefined) category.displayOrder = data.displayOrder;
    return repository.save(category);
  }

  async delete(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getRepository();
    const category = await this.findById(id, teamId);
    if (!category) {
      throw new Error("Catégorie de billet non trouvée");
    }

    const dataSource = await getDataSource();
    const usageCount = await dataSource.getRepository(TicketingEventCategory).count({ where: { ticketCategoryId: id } });
    if (usageCount > 0) {
      throw new Error("Cette catégorie est utilisée par au moins une billetterie, désactivez-la plutôt que de la supprimer");
    }

    await repository.remove(category);
    return true;
  }
}
