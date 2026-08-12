import { getDataSource } from "@/lib/database";
import { MarketplaceProduct } from "@/entities/MarketplaceProduct";
import { MarketplaceSeller } from "@/entities/MarketplaceSeller";
import { MarketplaceProductCategory } from "@/entities/MarketplaceProductCategory";
import { MarketplaceNotification } from "@/entities/MarketplaceNotification";
import { CLUB_ALLOWED_PRODUCT_TRANSITIONS, MarketplaceNotificationType, MarketplaceProductStatus } from "@/entities/marketplaceEnums";

export interface MarketplaceProductFilters {
  sellerId?: string;
  status?: MarketplaceProductStatus;
  categoryId?: string;
  name?: string;
  from?: string;
  to?: string;
}

/** Statuts visibles par le club : un produit DRAFT n'a pas encore été soumis, il n'appartient qu'au vendeur. */
const CLUB_VISIBLE_STATUSES = [
  MarketplaceProductStatus.SUBMITTED,
  MarketplaceProductStatus.UNDER_REVIEW,
  MarketplaceProductStatus.APPROVED,
  MarketplaceProductStatus.PUBLISHED,
  MarketplaceProductStatus.REJECTED,
];

/**
 * Modération club des produits marketplace (US-07 à US-11). Accès direct
 * cross-DB à `sp_products`/`sp_sellers` (voir MarketplaceProduct.ts) : toute
 * requête DOIT rester scopée à `seller.clubId = teamId`, c'est la seule
 * frontière d'isolation multi-club tant qu'il n'y a pas de marketplace-api.
 */
export class MarketplaceModerationService {
  private async repos() {
    const dataSource = await getDataSource();
    return {
      products: dataSource.getRepository(MarketplaceProduct),
      sellers: dataSource.getRepository(MarketplaceSeller),
      categories: dataSource.getRepository(MarketplaceProductCategory),
      notifications: dataSource.getRepository(MarketplaceNotification),
    };
  }

  async findSellersForClub(teamId: string): Promise<MarketplaceSeller[]> {
    const { sellers } = await this.repos();
    return sellers.find({ where: { clubId: teamId }, order: { businessName: "ASC" } });
  }

  async findCategoriesForClub(teamId: string): Promise<MarketplaceProductCategory[]> {
    const { categories } = await this.repos();
    return categories.find({ where: { clubId: teamId }, order: { name: "ASC" } });
  }

  async findAll(teamId: string, filters: MarketplaceProductFilters): Promise<MarketplaceProduct[]> {
    const { products } = await this.repos();
    const qb = products
      .createQueryBuilder("product")
      .innerJoinAndSelect("product.seller", "seller")
      .where("seller.clubId = :teamId", { teamId })
      .andWhere("product.status IN (:...statuses)", { statuses: CLUB_VISIBLE_STATUSES });

    if (filters.sellerId) qb.andWhere("product.sellerId = :sellerId", { sellerId: filters.sellerId });
    if (filters.status) qb.andWhere("product.status = :status", { status: filters.status });
    if (filters.categoryId) qb.andWhere("product.categoryId = :categoryId", { categoryId: filters.categoryId });
    if (filters.name) qb.andWhere("product.name LIKE :name", { name: `%${filters.name}%` });
    if (filters.from) qb.andWhere("product.createdAt >= :from", { from: new Date(filters.from) });
    if (filters.to) qb.andWhere("product.createdAt <= :to", { to: new Date(`${filters.to}T23:59:59Z`) });

    qb.orderBy("product.createdAt", "DESC");
    return qb.getMany();
  }

  /** Charge un produit scopé au club courant, ou null s'il n'existe pas / n'appartient pas à ce club. */
  async findById(id: string, teamId: string): Promise<MarketplaceProduct | null> {
    const { products } = await this.repos();
    return products
      .createQueryBuilder("product")
      .innerJoinAndSelect("product.seller", "seller")
      .where("product.id = :id", { id })
      .andWhere("seller.clubId = :teamId", { teamId })
      .getOne();
  }

  /**
   * Fait transiter un produit vers `nextStatus`, en validant la matrice
   * `CLUB_ALLOWED_PRODUCT_TRANSITIONS`. Renvoie l'état avant/après pour
   * que l'appelant puisse journaliser l'action (audit obligatoire, US-08).
   */
  async transition(
    id: string,
    teamId: string,
    userId: string,
    nextStatus: MarketplaceProductStatus,
    rejectionReason?: string
  ): Promise<{ before: MarketplaceProduct; after: MarketplaceProduct }> {
    const { products, notifications } = await this.repos();
    const product = await this.findById(id, teamId);
    if (!product) {
      throw new Error("Produit introuvable pour ce club");
    }

    const allowed = CLUB_ALLOWED_PRODUCT_TRANSITIONS[product.status] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new Error(`Transition ${product.status} → ${nextStatus} non autorisée`);
    }

    if (nextStatus === MarketplaceProductStatus.REJECTED && !rejectionReason?.trim()) {
      throw new Error("Un motif de rejet est obligatoire");
    }

    const before = { ...product };

    product.status = nextStatus;
    if (nextStatus === MarketplaceProductStatus.APPROVED || nextStatus === MarketplaceProductStatus.REJECTED) {
      product.reviewedBy = userId;
      product.reviewedAt = new Date();
      product.rejectionReason = nextStatus === MarketplaceProductStatus.REJECTED ? rejectionReason!.trim() : null;
    }

    const after = await products.save(product);

    if (nextStatus === MarketplaceProductStatus.APPROVED || nextStatus === MarketplaceProductStatus.REJECTED) {
      const notification = notifications.create({
        sellerId: product.sellerId,
        type: nextStatus === MarketplaceProductStatus.APPROVED
          ? MarketplaceNotificationType.PRODUCT_APPROVED
          : MarketplaceNotificationType.PRODUCT_REJECTED,
        title: nextStatus === MarketplaceProductStatus.APPROVED ? "Produit approuvé" : "Produit rejeté",
        message:
          nextStatus === MarketplaceProductStatus.APPROVED
            ? `Votre produit "${product.name}" a été approuvé par le club.`
            : `Votre produit "${product.name}" a été rejeté. Motif : ${product.rejectionReason}`,
      });
      await notifications.save(notification);
    }

    return { before, after };
  }
}
