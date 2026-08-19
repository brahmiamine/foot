import { In, Repository } from "typeorm";
import { getDataSource } from "@/lib/database";
import { TicketCategory } from "@/entities/TicketCategory";
import { MatchTicketCategory } from "@/entities/MatchTicketCategory";
import { TicketSaleRule } from "@/entities/TicketSaleRule";
import { Match } from "@/entities/Match";
import { ClubFeatureSettingsService } from "./ClubFeatureSettingsService";

export interface TicketCategoryInput {
  name: string;
  description?: string | null;
  basePrice: string;
  isActive?: boolean;
}

function slugify(input: string): string {
  return input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
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

/** Administration billetterie club, scopée et serveur-gardée par GOV-010. */
export class TicketingService {
  private async assertEnabled(clubId: string): Promise<void> {
    await new ClubFeatureSettingsService().assertEnabled(clubId, "TICKETING");
  }

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
    await this.assertEnabled(clubId);
    const repo = await this.categoryRepo();
    return repo.find({ where: { clubId }, order: { name: "ASC" } });
  }

  async findCategory(id: string, clubId: string): Promise<TicketCategory | null> {
    await this.assertEnabled(clubId);
    const repo = await this.categoryRepo();
    return repo.findOne({ where: { id, clubId } });
  }

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
    await this.assertEnabled(clubId);
    const repo = await this.categoryRepo();
    const slug = await this.uniqueSlug(clubId, data.name);
    return repo.save(repo.create({ ...data, clubId, slug, isActive: data.isActive ?? true }));
  }

  async updateCategory(id: string, clubId: string, data: Partial<TicketCategoryInput>): Promise<TicketCategory> {
    await this.assertEnabled(clubId);
    const repo = await this.categoryRepo();
    const category = await repo.findOne({ where: { id, clubId } });
    if (!category) throw new Error("Catégorie introuvable.");
    if (data.name && data.name !== category.name) category.slug = await this.uniqueSlug(clubId, data.name, category.id);
    Object.assign(category, data);
    return repo.save(category);
  }

  async deleteCategory(id: string, clubId: string): Promise<void> {
    await this.assertEnabled(clubId);
    const repo = await this.categoryRepo();
    const category = await repo.findOne({ where: { id, clubId } });
    if (!category) throw new Error("Catégorie introuvable.");
    const usageCount = await (await this.mtcRepo()).count({ where: { categoryId: id } });
    if (usageCount > 0) throw new Error("Cette catégorie est utilisée sur au moins un match : retirez-la des matchs concernés avant de la supprimer.");
    await repo.remove(category);
  }

  async listHomeMatches(clubId: string): Promise<Match[]> {
    await this.assertEnabled(clubId);
    const repo = await this.matchRepo();
    return repo.find({ where: { equipeHome: clubId }, relations: ["awayTeam"], order: { date: "DESC" } });
  }

  async findHomeMatch(matchId: string, clubId: string): Promise<Match | null> {
    await this.assertEnabled(clubId);
    const repo = await this.matchRepo();
    const match = await repo.findOne({ where: { id: matchId }, relations: ["awayTeam"] });
    if (!match || match.equipeHome !== clubId) return null;
    return match;
  }

  async listOffers(matchId: string, clubId: string): Promise<MatchOfferWithDetails[]> {
    await this.assertEnabled(clubId);
    const mtcRepo = await this.mtcRepo();
    const offers = await mtcRepo.find({ where: { matchId } });
    if (offers.length === 0) return [];
    const categoryRepo = await this.categoryRepo();
    const categories = await categoryRepo.findBy({ id: In(offers.map((offer) => offer.categoryId)), clubId });
    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const ruleRepo = await this.ruleRepo();
    const rules = await ruleRepo.findBy({ matchTicketCategoryId: In(offers.map((offer) => offer.id)) });
    const ruleByOffer = new Map(rules.map((rule) => [rule.matchTicketCategoryId, rule]));
    return offers.filter((offer) => categoryById.has(offer.categoryId)).map((offer) => ({
      offer,
      category: categoryById.get(offer.categoryId)!,
      rule: ruleByOffer.get(offer.id) ?? null,
    }));
  }

  async upsertOffer(clubId: string, matchId: string, categoryId: string, data: MatchOfferInput): Promise<MatchTicketCategory> {
    await this.assertEnabled(clubId);
    const match = await this.findHomeMatch(matchId, clubId);
    if (!match) throw new Error("Match introuvable pour ce club.");
    const category = await this.findCategory(categoryId, clubId);
    if (!category) throw new Error("Catégorie introuvable pour ce club.");

    const mtcRepo = await this.mtcRepo();
    let offer = await mtcRepo.findOne({ where: { matchId, categoryId } });
    if (!offer) offer = mtcRepo.create({ matchId, categoryId, price: data.price, capacity: data.capacity });
    else {
      if (data.capacity < offer.soldCount) throw new Error(`La capacité ne peut pas être inférieure au nombre de billets déjà vendus (${offer.soldCount}).`);
      offer.price = data.price;
      offer.capacity = data.capacity;
    }
    offer = await mtcRepo.save(offer);

    const ruleRepo = await this.ruleRepo();
    let rule = await ruleRepo.findOne({ where: { matchTicketCategoryId: offer.id } });
    if (!rule) rule = ruleRepo.create({ matchTicketCategoryId: offer.id });
    rule.allowedAudience = data.allowedAudience;
    rule.maxTicketsPerUser = data.maxTicketsPerUser;
    rule.startsAt = data.startsAt;
    rule.endsAt = data.endsAt;
    await ruleRepo.save(rule);
    return offer;
  }

  async deleteOffer(clubId: string, offerId: string, matchId: string): Promise<void> {
    await this.assertEnabled(clubId);
    const match = await this.findHomeMatch(matchId, clubId);
    if (!match) throw new Error("Match introuvable pour ce club.");
    const mtcRepo = await this.mtcRepo();
    const offer = await mtcRepo.findOne({ where: { id: offerId, matchId } });
    if (!offer) throw new Error("Offre introuvable.");
    if (offer.soldCount > 0) throw new Error("Des billets ont déjà été vendus pour cette offre : suppression impossible.");
    await (await this.ruleRepo()).delete({ matchTicketCategoryId: offer.id });
    await mtcRepo.remove(offer);
  }
}