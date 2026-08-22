import { randomUUID } from "node:crypto";
import { getDataSource } from "@/lib/database";
import { Match } from "@/entities/Match";
import { MatchTicketCategory } from "@/entities/MatchTicketCategory";
import { TicketPromotion, type TicketPromotionDiscountType } from "@/entities/TicketPromotion";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

export interface CreatePromotionInput {
  matchTicketCategoryId: string;
  code: string;
  discountType: TicketPromotionDiscountType;
  discountValue: string;
  maxUses?: number | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
}

/**
 * TICK-008 (P2) — promotions à code, tarification contrôlée : une
 * promotion doit être approuvée (maker/checker) avant d'être utilisable,
 * chaque usage est compté (`usedCount`/`maxUses`) et audité par la ligne
 * elle-même (createdBy/approvedBy/approvedAt). Le "package" multi-catégories
 * reste hors périmètre — voir la note sur l'entité.
 */
export class TicketPromotionService {
  private async resolveOwnedCategory(matchTicketCategoryId: string, clubId: string) {
    const ds = await getDataSource();
    const mtc = await ds.getRepository(MatchTicketCategory).findOne({ where: { id: matchTicketCategoryId } });
    if (!mtc) throw new NotFoundError("Offre de billetterie introuvable");
    const match = await ds.getRepository(Match).findOne({ where: { id: mtc.matchId } });
    if (!match) throw new NotFoundError("Match introuvable");
    if (match.equipeHome !== clubId) throw new ForbiddenError("Cette offre n'appartient pas à votre club");
    return { mtc, match };
  }

  async create(clubId: string, actorUserId: string, input: CreatePromotionInput): Promise<TicketPromotion> {
    await this.resolveOwnedCategory(input.matchTicketCategoryId, clubId);
    const code = input.code.trim().toUpperCase();
    if (!code) throw new ForbiddenError("Un code de promotion est obligatoire");
    const discountValue = Number(input.discountValue);
    if (!Number.isFinite(discountValue) || discountValue <= 0) throw new ForbiddenError("La valeur de remise doit être positive");
    if (input.discountType === "PERCENTAGE" && discountValue > 100) {
      throw new ForbiddenError("Une remise en pourcentage ne peut pas dépasser 100");
    }
    if (input.maxUses != null && (!Number.isInteger(input.maxUses) || input.maxUses < 1)) {
      throw new ForbiddenError("maxUses doit être un entier strictement positif");
    }
    if (input.startsAt && input.endsAt && input.startsAt.getTime() >= input.endsAt.getTime()) {
      throw new ForbiddenError("La date de fin doit être postérieure à la date de début");
    }

    const ds = await getDataSource();
    const repo = ds.getRepository(TicketPromotion);
    const existing = await repo.findOne({ where: { matchTicketCategoryId: input.matchTicketCategoryId, code } });
    if (existing) throw new ForbiddenError("Ce code de promotion existe déjà pour cette offre");

    return repo.save(
      repo.create({
        id: randomUUID(),
        matchTicketCategoryId: input.matchTicketCategoryId,
        code,
        discountType: input.discountType,
        discountValue: discountValue.toFixed(3),
        maxUses: input.maxUses ?? null,
        usedCount: 0,
        startsAt: input.startsAt ?? null,
        endsAt: input.endsAt ?? null,
        status: "DRAFT",
        createdBy: actorUserId,
      }),
    );
  }

  async approve(promotionId: string, clubId: string, actorUserId: string): Promise<TicketPromotion> {
    const ds = await getDataSource();
    const repo = ds.getRepository(TicketPromotion);
    const promotion = await repo.findOne({ where: { id: promotionId } });
    if (!promotion) throw new NotFoundError("Promotion introuvable");
    await this.resolveOwnedCategory(promotion.matchTicketCategoryId, clubId);
    if (promotion.status !== "DRAFT") throw new ForbiddenError("Cette promotion n'est pas en attente d'approbation");
    if (promotion.createdBy === actorUserId) throw new ForbiddenError("Le créateur ne peut pas approuver sa propre promotion");
    promotion.status = "APPROVED";
    promotion.approvedBy = actorUserId;
    promotion.approvedAt = new Date();
    return repo.save(promotion);
  }

  async listForCategory(matchTicketCategoryId: string): Promise<TicketPromotion[]> {
    const ds = await getDataSource();
    return ds.getRepository(TicketPromotion).find({ where: { matchTicketCategoryId }, order: { createdAt: "DESC" } });
  }
}
