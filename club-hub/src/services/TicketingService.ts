import { In, Repository } from "typeorm";
import { getDataSource } from "@/lib/database";
import { TicketCategory } from "@/entities/TicketCategory";
import { MatchTicketCategory } from "@/entities/MatchTicketCategory";
import { TicketSaleRule } from "@/entities/TicketSaleRule";
import { Match } from "@/entities/Match";

export interface TicketCategoryInput {
  name: string;
  description?: string | null;
  basePrice: string;
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

export interface MatchOfferInput {
  price: string;
  capacity: number;
  allowedAudience: TicketSaleRule["allowedAudience"];
  maxTicketsPerUser: number;
  startsAt: Date | null;
  endsAt: Date | null;
}

export interface MatchOfferWithDetails {
  offer: MatchTicketCategory;
  category: TicketCategory;
  rule: TicketSaleRule | null;
}

/**
 * Administration de la ticketing d'un club (tables `tk_*`, partagées en
 * écriture avec `ticketing` — voir entities/TicketCategory.ts). Toujours
 * scopée par `clubId`/`equipeHome` : jamais un id de catégorie/offre pris
 * sur la seule confiance d'un paramètre client sans revérifier son club.
 */
export class TicketingService {
  private async categoryRepo(): Promise<Repository<TicketCategory>> {
    return (await getDataSource()).getRepository(TicketCategory);
  }
  private async mtcRepo(): Promise<Repository<MatchTicketCategory>> {
    return (await getDataSource()).getRepository(MatchTicketCategory);
  }
  private async ruleRepo(): Promise<Repository<TicketSaleRule>> {
    return (await getDataSource()).getRepository(TicketSaleRule);
  }
  private async matchRepo(): Promise<Repository<Match>> {
    return (await getDataSource()).getRepository(Match);
  }

  async listCategories(clubId: string): Promise<TicketCategory[]> {
    const repo = await this.categoryRepo();
    return repo.find({ where: { clubId }, order: { name: "ASC" } });
  }

  async findCategory(id: string, clubId: string): Promise<TicketCategory | null> {
    const repo = await this.categoryRepo();
    return repo.findOne({ where: { id, clubId } });
  }

  // Slug dérivé automatiquement du nom (pas de champ dédié dans le
  // formulaire) — désambiguïsé par club s'il entre en collision.
  private async uniqueSlug(clubId: string, name: string, excludeId?: string): Promise<string> {
    const repo = await this.categoryRepo();
    const base = slugify(name) || "categorie";
    let slug = base;
    let attempt = 2;
    while (true) {
      const existing = await repo.findOne({ where: { clubId, slug } });
      if (!existing || existing.id === excludeId) return slug;
      slug = `${base}-${attempt++}`;
    }
  }

  async createCategory(clubId: string, data: TicketCategoryInput): Promise<TicketCategory> {
    const repo = await this.categoryRepo();
    const slug = await this.uniqueSlug(clubId, data.name);
    const category = repo.create({ ...data, clubId, slug, isActive: data.isActive ?? true });
    return repo.save(category);
  }

  async updateCategory(id: string, clubId: string, data: Partial<TicketCategoryInput>): Promise<TicketCategory> {
    const category = await this.findCategory(id, clubId);
    if (!category) throw new Error("Catégorie introuvable.");
    if (data.name && data.name !== category.name) {
      category.slug = await this.uniqueSlug(clubId, data.name, category.id);
    }
    Object.assign(category, data);
    const repo = await this.categoryRepo();
    return repo.save(category);
  }

  async deleteCategory(id: string, clubId: string): Promise<void> {
    const category = await this.findCategory(id, clubId);
    if (!category) throw new Error("Catégorie introuvable.");
    const mtcRepo = await this.mtcRepo();
    const usageCount = await mtcRepo.count({ where: { categoryId: id } });
    if (usageCount > 0) {
      throw new Error("Cette catégorie est utilisée sur au moins un match : retirez-la des matchs concernés avant de la supprimer.");
    }
    const repo = await this.categoryRepo();
    await repo.remove(category);
  }

  // Matchs où le club reçoit — organizerTeamId d'un billet est toujours
  // matches.equipe_home, donc seul le club recevant peut ouvrir la
  // ticketing d'un match (voir README racine § « Billetterie »).
  async listHomeMatches(clubId: string): Promise<Match[]> {
    const repo = await this.matchRepo();
    return repo.find({ where: { equipeHome: clubId }, relations: ["awayTeam"], order: { date: "DESC" } });
  }

  async findHomeMatch(matchId: string, clubId: string): Promise<Match | null> {
    const repo = await this.matchRepo();
    const match = await repo.findOne({ where: { id: matchId }, relations: ["awayTeam"] });
    if (!match || match.equipeHome !== clubId) return null;
    return match;
  }

  async listOffers(matchId: string): Promise<MatchOfferWithDetails[]> {
    const mtcRepo = await this.mtcRepo();
    const offers = await mtcRepo.find({ where: { matchId } });
    if (offers.length === 0) return [];

    const categoryRepo = await this.categoryRepo();
    const categories = await categoryRepo.findBy({ id: In(offers.map((o) => o.categoryId)) });
    const categoryById = new Map(categories.map((c) => [c.id, c]));

    const ruleRepo = await this.ruleRepo();
    const rules = await ruleRepo.findBy({ matchTicketCategoryId: In(offers.map((o) => o.id)) });
    const ruleByOffer = new Map(rules.map((r) => [r.matchTicketCategoryId, r]));

    return offers
      .filter((offer) => categoryById.has(offer.categoryId))
      .map((offer) => ({
        offer,
        category: categoryById.get(offer.categoryId)!,
        rule: ruleByOffer.get(offer.id) ?? null,
      }));
  }

  // Crée l'offre (catégorie x match) si elle n'existe pas encore, sinon met
  // à jour prix/capacité + la règle de vente associée (une seule par offre).
  async upsertOffer(matchId: string, categoryId: string, data: MatchOfferInput): Promise<MatchTicketCategory> {
    const mtcRepo = await this.mtcRepo();
    let offer = await mtcRepo.findOne({ where: { matchId, categoryId } });
    if (!offer) {
      offer = mtcRepo.create({ matchId, categoryId, price: data.price, capacity: data.capacity });
    } else {
      if (data.capacity < offer.soldCount) {
        throw new Error(`La capacité ne peut pas être inférieure au nombre de billets déjà vendus (${offer.soldCount}).`);
      }
      offer.price = data.price;
      offer.capacity = data.capacity;
    }
    offer = await mtcRepo.save(offer);

    const ruleRepo = await this.ruleRepo();
    let rule = await ruleRepo.findOne({ where: { matchTicketCategoryId: offer.id } });
    if (!rule) {
      rule = ruleRepo.create({ matchTicketCategoryId: offer.id });
    }
    rule.allowedAudience = data.allowedAudience;
    rule.maxTicketsPerUser = data.maxTicketsPerUser;
    rule.startsAt = data.startsAt;
    rule.endsAt = data.endsAt;
    await ruleRepo.save(rule);

    return offer;
  }

  async deleteOffer(offerId: string, matchId: string): Promise<void> {
    const mtcRepo = await this.mtcRepo();
    const offer = await mtcRepo.findOne({ where: { id: offerId, matchId } });
    if (!offer) throw new Error("Offre introuvable.");
    if (offer.soldCount > 0) {
      throw new Error("Des billets ont déjà été vendus pour cette offre : suppression impossible.");
    }
    const ruleRepo = await this.ruleRepo();
    await ruleRepo.delete({ matchTicketCategoryId: offer.id });
    await mtcRepo.remove(offer);
  }
}
