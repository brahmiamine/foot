import { randomUUID } from "node:crypto";
import { getDataSource } from "@/lib/database";
import { Match } from "@/entities/Match";
import { MatchTicketCategory } from "@/entities/MatchTicketCategory";
import { TicketCategory } from "@/entities/TicketCategory";
import { Ticket } from "@/entities/Ticket";
import { SeasonPass } from "@/entities/SeasonPass";
import { SeasonPassRedemption } from "@/entities/SeasonPassRedemption";
import { TicketSaleGovernanceService } from "@/services/TicketSaleGovernanceService";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { generateTicketReference } from "@/lib/reference";

/**
 * TICK-007 (P2) — abonnement saison : entitlement à retirer un billet pour
 * n'importe quel match couvrant une catégorie donnée, tant que le pass est
 * ACTIVE et dans sa fenêtre. Le flux de paiement réel de l'abonnement
 * lui-même reste hors périmètre de ce lot (voir platform-governance-roadmap.md) :
 * `price` est enregistré pour traçabilité, la validation du paiement
 * externe est laissée à l'app appelante (même esprit que TICK-003, où le
 * billet gratuit est créé directement une fois l'approbation acquise).
 */
export class SeasonPassService {
  async purchase(clubId: string, categoryId: string, purchaserId: string): Promise<SeasonPass> {
    const ds = await getDataSource();
    const category = await ds.getRepository(TicketCategory).findOne({ where: { id: categoryId, clubId } });
    if (!category) throw new NotFoundError("Catégorie de billet introuvable pour ce club");

    const settings = await new TicketSaleGovernanceService().getSettings(clubId);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + settings.seasonPassDurationDays * 24 * 60 * 60 * 1000);

    const repo = ds.getRepository(SeasonPass);
    return repo.save(
      repo.create({
        id: randomUUID(),
        clubId,
        categoryId,
        purchaserId,
        status: "ACTIVE",
        startsAt: now,
        expiresAt,
        renewedFromId: null,
        price: category.basePrice,
        paymentId: null,
      }),
    );
  }

  async renew(passId: string, purchaserId: string): Promise<SeasonPass> {
    const ds = await getDataSource();
    const repo = ds.getRepository(SeasonPass);
    const current = await repo.findOne({ where: { id: passId, purchaserId } });
    if (!current) throw new NotFoundError("Abonnement introuvable");
    if (current.status === "CANCELLED") throw new ForbiddenError("Un abonnement annulé ne peut pas être renouvelé");

    const settings = await new TicketSaleGovernanceService().getSettings(current.clubId);
    const startsAt = current.expiresAt.getTime() > Date.now() ? current.expiresAt : new Date();
    const expiresAt = new Date(startsAt.getTime() + settings.seasonPassDurationDays * 24 * 60 * 60 * 1000);

    return repo.save(
      repo.create({
        id: randomUUID(),
        clubId: current.clubId,
        categoryId: current.categoryId,
        purchaserId,
        status: "ACTIVE",
        startsAt,
        expiresAt,
        renewedFromId: current.id,
        price: current.price,
        paymentId: null,
      }),
    );
  }

  async cancel(passId: string, purchaserId: string): Promise<SeasonPass> {
    const ds = await getDataSource();
    const repo = ds.getRepository(SeasonPass);
    const pass = await repo.findOne({ where: { id: passId, purchaserId } });
    if (!pass) throw new NotFoundError("Abonnement introuvable");
    if (pass.status !== "ACTIVE") throw new ForbiddenError("Cet abonnement n'est pas actif");
    pass.status = "CANCELLED";
    return repo.save(pass);
  }

  async listMine(purchaserId: string): Promise<SeasonPass[]> {
    const ds = await getDataSource();
    return ds.getRepository(SeasonPass).find({ where: { purchaserId }, order: { createdAt: "DESC" } });
  }

  /** Retire un billet gratuit pour `matchTicketCategoryId` en consommant l'entitlement — une seule fois par match. */
  async redeem(seasonPassId: string, matchTicketCategoryId: string, purchaserId: string): Promise<Ticket> {
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const pass = await manager.findOne(SeasonPass, { where: { id: seasonPassId, purchaserId } });
      if (!pass) throw new NotFoundError("Abonnement introuvable");
      const now = Date.now();
      if (pass.status !== "ACTIVE" || now < pass.startsAt.getTime() || now >= pass.expiresAt.getTime()) {
        throw new ForbiddenError("Cet abonnement n'est pas actif pour le moment");
      }

      const mtc = await manager.findOne(MatchTicketCategory, {
        where: { id: matchTicketCategoryId },
        lock: { mode: "pessimistic_write" },
      });
      if (!mtc) throw new NotFoundError("Offre de billetterie introuvable");
      if (mtc.categoryId !== pass.categoryId) {
        throw new ForbiddenError("Cet abonnement ne couvre pas cette catégorie de billet");
      }
      const match = await manager.findOne(Match, { where: { id: mtc.matchId } });
      if (!match || match.equipeHome !== pass.clubId) throw new ForbiddenError("Cet abonnement ne couvre pas ce club");
      if (match.status === "CANCELLED") throw new ForbiddenError("Ce match a été annulé");

      const existingRedemption = await manager.findOne(SeasonPassRedemption, {
        where: { seasonPassId, matchTicketCategoryId },
      });
      if (existingRedemption) throw new ForbiddenError("Ce match a déjà été retiré avec cet abonnement");

      const updateResult = await manager
        .createQueryBuilder()
        .update(MatchTicketCategory)
        .set({ soldCount: () => "sold_count + 1" })
        .where("id = :id AND sold_count + 1 <= capacity", { id: mtc.id })
        .execute();
      if (updateResult.affected !== 1) throw new ForbiddenError("Il ne reste plus de place disponible pour ce match");

      const ticket = await manager.save(
        manager.create(Ticket, {
          matchId: mtc.matchId,
          matchTicketCategoryId: mtc.id,
          organizerTeamId: pass.clubId,
          purchaserId,
          status: "PAID",
          reference: generateTicketReference(),
          price: "0.000",
          source: "SEASON_PASS",
          seasonPassId: pass.id,
          paidAt: new Date(),
          declaredAudience: "PUBLIC",
        }),
      );

      await manager.save(
        manager.create(SeasonPassRedemption, {
          id: randomUUID(),
          seasonPassId,
          matchTicketCategoryId,
          ticketId: ticket.id,
        }),
      );

      return ticket;
    });
  }
}
