import { getDataSource } from "@/lib/database";
import { ProductCategory } from "@/entities/ProductCategory";
import { Repository } from "typeorm";

/**
 * Service for ProductCategory operations (catégories de la boutique).
 */
export class ProductCategoryService {
  private async getRepository(): Promise<Repository<ProductCategory>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(ProductCategory);
  }

  async findAll(teamId: string): Promise<ProductCategory[]> {
    const repository = await this.getRepository();
    return repository.find({ where: { teamId }, order: { nameFr: "ASC" } });
  }

  async findById(id: number, teamId: string): Promise<ProductCategory | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id, teamId } });
  }

  async create(data: { nameFr: string; nameAr?: string | null }, teamId: string): Promise<ProductCategory> {
    const repository = await this.getRepository();
    const category = repository.create({ ...data, teamId });
    return repository.save(category);
  }

  async update(id: number, teamId: string, data: { nameFr?: string; nameAr?: string | null }): Promise<ProductCategory> {
    const repository = await this.getRepository();
    const category = await this.findById(id, teamId);
    if (!category) {
      throw new Error("Catégorie non trouvée");
    }
    Object.assign(category, data);
    return repository.save(category);
  }

  async delete(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getRepository();
    const category = await this.findById(id, teamId);
    if (!category) {
      throw new Error("Catégorie non trouvée");
    }
    await repository.remove(category);
    return true;
  }
}
