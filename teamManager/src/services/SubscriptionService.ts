import { In, Repository } from "typeorm";
import { getDataSource } from "@/lib/database";
import { SubscriptionCategory } from "@/entities/SubscriptionCategory";
import { Subscription } from "@/entities/Subscription";
import { User } from "@/entities/User";

export interface SubscriptionCategoryInput {
  name: string;
  description?: string | null;
  price: string;
  color?: string | null;
  validFrom: Date;
  validUntil: Date;
  isActive?: boolean;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export interface SubscriptionWithPurchaser {
  subscription: Subscription;
  purchaserName: string;
  purchaserEmail: string;
}

/**
 * Administration des abonnements de saison du club — CRUD complet sur
 * `tk_subscription_categories` (propriété de cette app, partagée en lecture
 * avec `billetterie` — voir entities/SubscriptionCategory.ts), plus lecture
 * seule du roster des abonnés sur `tk_subscriptions` (propriété de
 * `billetterie`, voir entities/Subscription.ts). Toujours scopée par
 * `clubId` : jamais un id de catégorie pris sur la seule confiance d'un
 * paramètre client sans revérifier son club.
 */
export class SubscriptionService {
  private async categoryRepo(): Promise<Repository<SubscriptionCategory>> {
    return (await getDataSource()).getRepository(SubscriptionCategory);
  }
  private async subscriptionRepo(): Promise<Repository<Subscription>> {
    return (await getDataSource()).getRepository(Subscription);
  }

  async listCategories(clubId: string): Promise<SubscriptionCategory[]> {
    const repo = await this.categoryRepo();
    return repo.find({ where: { clubId }, order: { price: "ASC" } });
  }

  async findCategory(id: string, clubId: string): Promise<SubscriptionCategory | null> {
    const repo = await this.categoryRepo();
    return repo.findOne({ where: { id, clubId } });
  }

  // Slug dérivé automatiquement du nom (pas de champ dédié dans le
  // formulaire) — désambiguïsé par club s'il entre en collision. Même
  // principe que TicketingService.uniqueSlug.
  private async uniqueSlug(clubId: string, name: string, excludeId?: string): Promise<string> {
    const repo = await this.categoryRepo();
    const base = slugify(name) || "abonnement";
    let slug = base;
    let attempt = 2;
    while (true) {
      const existing = await repo.findOne({ where: { clubId, slug } });
      if (!existing || existing.id === excludeId) return slug;
      slug = `${base}-${attempt++}`;
    }
  }

  async createCategory(clubId: string, data: SubscriptionCategoryInput): Promise<SubscriptionCategory> {
    const repo = await this.categoryRepo();
    const slug = await this.uniqueSlug(clubId, data.name);
    const category = repo.create({ ...data, clubId, slug, isActive: data.isActive ?? true });
    return repo.save(category);
  }

  async updateCategory(id: string, clubId: string, data: Partial<SubscriptionCategoryInput>): Promise<SubscriptionCategory> {
    const category = await this.findCategory(id, clubId);
    if (!category) throw new Error("Catégorie d'abonnement introuvable.");
    if (data.name && data.name !== category.name) {
      category.slug = await this.uniqueSlug(clubId, data.name, category.id);
    }
    Object.assign(category, data);
    const repo = await this.categoryRepo();
    return repo.save(category);
  }

  async deleteCategory(id: string, clubId: string): Promise<void> {
    const category = await this.findCategory(id, clubId);
    if (!category) throw new Error("Catégorie d'abonnement introuvable.");
    const subRepo = await this.subscriptionRepo();
    const usageCount = await subRepo.count({ where: { subscriptionCategoryId: id } });
    if (usageCount > 0) {
      throw new Error("Cette catégorie a déjà des abonnés : elle ne peut plus être supprimée (désactivez-la à la place).");
    }
    const repo = await this.categoryRepo();
    await repo.remove(category);
  }

  /**
   * Roster en lecture seule des abonnements vendus pour le club — jointure
   * applicative (pas de FK réelle cross-connexion) entre `tk_subscriptions`
   * (billetterie) et `User` (sso) pour afficher qui a acheté quoi.
   */
  async listSubscriptions(clubId: string): Promise<SubscriptionWithPurchaser[]> {
    const subRepo = await this.subscriptionRepo();
    const subscriptions = await subRepo.find({ where: { organizerTeamId: clubId }, order: { createdAt: "DESC" } });
    if (subscriptions.length === 0) return [];

    const ds = await getDataSource();
    const purchaserIds = Array.from(new Set(subscriptions.map((s) => s.purchaserId)));
    const users = await ds.getRepository(User).find({ where: { id: In(purchaserIds) } });
    const userById = new Map(users.map((u) => [u.id, u]));

    const categoryIds = Array.from(new Set(subscriptions.map((s) => s.subscriptionCategoryId)));
    const categoryRepo = await this.categoryRepo();
    const categories = await categoryRepo.find({ where: { id: In(categoryIds) } });
    const categoryById = new Map(categories.map((c) => [c.id, c]));

    return subscriptions.map((subscription) => {
      const user = userById.get(subscription.purchaserId);
      subscription.category = categoryById.get(subscription.subscriptionCategoryId);
      return {
        subscription,
        purchaserName: user?.name ?? "Membre",
        purchaserEmail: user?.email ?? "—",
      };
    });
  }
}
