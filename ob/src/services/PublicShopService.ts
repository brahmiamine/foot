import { getDataSource } from "@/lib/database";
import { Product } from "@/entities/Product";

export class PublicShopService {
  async getActiveProducts(teamId: string, limit = 4): Promise<Product[]> {
    const ds = await getDataSource();
    return ds.getRepository(Product).find({ where: { teamId, isActive: true }, order: { id: "DESC" }, take: limit });
  }

  /** Catalogue complet, pour la page /boutique. */
  async getAllActive(teamId: string): Promise<Product[]> {
    const ds = await getDataSource();
    return ds.getRepository(Product).find({ where: { teamId, isActive: true }, order: { id: "DESC" } });
  }
}
