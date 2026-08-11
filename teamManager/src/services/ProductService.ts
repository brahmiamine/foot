import { getDataSource } from "@/lib/database";
import { Product } from "@/entities/Product";
import { Repository } from "typeorm";

interface ProductInput {
  categoryId?: number | null;
  nameFr?: string;
  nameAr?: string | null;
  descriptionFr?: string | null;
  descriptionAr?: string | null;
  price?: number;
  stock?: number;
  imageUrl?: string | null;
  isActive?: boolean;
}

/**
 * Service for Product operations (catalogue boutique : stock, prix, image —
 * pas de commande/paiement en V1).
 */
export class ProductService {
  private async getRepository(): Promise<Repository<Product>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Product);
  }

  async findAll(teamId: string): Promise<Product[]> {
    const repository = await this.getRepository();
    return repository.find({ where: { teamId }, relations: ["category"], order: { createdAt: "DESC" } });
  }

  async findById(id: number, teamId: string): Promise<Product | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id, teamId }, relations: ["category"] });
  }

  /**
   * Catalogue affiché sur la boutique publique (/boutique/[teamId]) :
   * uniquement les produits actifs — contrairement à `findAll`, utilisé par
   * l'admin, qui liste aussi les produits désactivés.
   */
  async findActiveByTeam(teamId: string): Promise<Product[]> {
    const repository = await this.getRepository();
    return repository.find({ where: { teamId, isActive: true }, relations: ["category"], order: { createdAt: "DESC" } });
  }

  async create(data: ProductInput, teamId: string): Promise<Product> {
    const repository = await this.getRepository();
    const product = repository.create({
      teamId,
      categoryId: data.categoryId ?? null,
      nameFr: data.nameFr!,
      nameAr: data.nameAr ?? null,
      descriptionFr: data.descriptionFr ?? null,
      descriptionAr: data.descriptionAr ?? null,
      price: String(data.price ?? 0),
      stock: data.stock ?? 0,
      imageUrl: data.imageUrl ?? null,
      isActive: data.isActive ?? true,
    });
    return repository.save(product);
  }

  async update(id: number, teamId: string, data: ProductInput): Promise<Product> {
    const repository = await this.getRepository();
    const product = await this.findById(id, teamId);
    if (!product) {
      throw new Error("Produit non trouvé");
    }

    if (data.categoryId !== undefined) product.categoryId = data.categoryId;
    if (data.nameFr !== undefined) product.nameFr = data.nameFr;
    if (data.nameAr !== undefined) product.nameAr = data.nameAr;
    if (data.descriptionFr !== undefined) product.descriptionFr = data.descriptionFr;
    if (data.descriptionAr !== undefined) product.descriptionAr = data.descriptionAr;
    if (data.price !== undefined) product.price = String(data.price);
    if (data.stock !== undefined) product.stock = data.stock;
    if (data.imageUrl !== undefined) product.imageUrl = data.imageUrl;
    if (data.isActive !== undefined) product.isActive = data.isActive;

    return repository.save(product);
  }

  async delete(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getRepository();
    const product = await this.findById(id, teamId);
    if (!product) {
      throw new Error("Produit non trouvé");
    }
    await repository.remove(product);
    return true;
  }
}
