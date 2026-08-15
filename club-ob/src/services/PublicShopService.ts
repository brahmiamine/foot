import { getDataSource } from "@/lib/database";
import { cachePublicData } from "@/lib/public-cache";
import { Product } from "@/entities/Product";

export class PublicShopService {
  async getActiveProducts(teamId: string, limit = 4): Promise<Product[]> {
    return cachePublicData(["shop", "active", teamId, String(limit)], async () => {
      const ds = await getDataSource();
      return ds.getRepository(Product).find({
        where: { teamId, isActive: true },
        order: { id: "DESC" },
        take: limit,
      });
    }, 60);
  }

  /** Catalogue complet, pour la page /boutique. */
  async getAllActive(teamId: string): Promise<Product[]> {
    return cachePublicData(["shop", "all", teamId], async () => {
      const ds = await getDataSource();
      return ds.getRepository(Product).find({
        where: { teamId, isActive: true },
        order: { id: "DESC" },
      });
    }, 60);
  }
}
