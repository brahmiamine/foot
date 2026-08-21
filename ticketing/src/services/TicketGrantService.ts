import { randomUUID } from "node:crypto";
import { In, type EntityManager } from "typeorm";
import { getDataSource } from "@/lib/database";
import { Match } from "@/entities/Match";
import { MatchTicketCategory } from "@/entities/MatchTicketCategory";
import { TicketSaleRule } from "@/entities/TicketSaleRule";
import { Ticket } from "@/entities/Ticket";
import { TicketGrant } from "@/entities/TicketGrant";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { generateTicketReference } from "@/lib/reference";

export interface RequestGrantInput {
  matchTicketCategoryId: string;
  recipientName: string;
  recipientEmail?: string | null;
  quantity: number;
  reason: string;
}

/**
 * TICK-003 — billets gratuits/invitations : quota (TicketSaleRule.compQuota)
 * + approbation (maker/checker, même principe que TicketSaleGovernanceService)
 * + traçabilité (une ligne TicketGrant par demande, jamais mutée hors de sa
 * propre progression de statut ; les tickets créés portent `source='GRANT'`
 * et `grantId`).
 */
export class TicketGrantService {
  private async resolveOwnedCategory(matchTicketCategoryId: string, clubId: string, manager?: EntityManager) {
    const ds = manager ?? (await getDataSource());
    const mtc = await ds.getRepository(MatchTicketCategory).findOne({ where: { id: matchTicketCategoryId } });
    if (!mtc) throw new NotFoundError("Offre de billetterie introuvable");
    const match = await ds.getRepository(Match).findOne({ where: { id: mtc.matchId } });
    if (!match) throw new NotFoundError("Match introuvable");
    if (match.equipeHome !== clubId) throw new ForbiddenError("Cette offre n'appartient pas à votre club");
    return { mtc, match };
  }

  private async approvedQuantitySum(matchTicketCategoryId: string, excludeGrantId?: string, manager?: EntityManager): Promise<number> {
    const ds = manager ?? (await getDataSource());
    const approved = await ds.getRepository(TicketGrant).find({ where: { matchTicketCategoryId, status: "APPROVED" } });
    return approved
      .filter((grant) => grant.id !== excludeGrantId)
      .reduce((sum, grant) => sum + grant.quantity, 0);
  }

  async request(clubId: string, requestedByUserId: string, input: RequestGrantInput): Promise<TicketGrant> {
    const { mtc } = await this.resolveOwnedCategory(input.matchTicketCategoryId, clubId);
    const quantity = Math.trunc(input.quantity);
    if (!Number.isFinite(quantity) || quantity < 1) throw new ForbiddenError("La quantité doit être d'au moins 1 billet");
    const recipientName = input.recipientName.trim();
    if (!recipientName) throw new ForbiddenError("Le nom du bénéficiaire est obligatoire");
    const reason = input.reason.trim();
    if (reason.length < 5) throw new ForbiddenError("Un motif est obligatoire pour une invitation");

    const rule = await (await getDataSource()).getRepository(TicketSaleRule).findOne({ where: { matchTicketCategoryId: mtc.id } });
    const compQuota = rule?.compQuota ?? 0;
    const alreadyApproved = await this.approvedQuantitySum(mtc.id);
    if (alreadyApproved + quantity > compQuota) {
      throw new ForbiddenError(`Quota d'invitations dépassé (${alreadyApproved}/${compQuota} déjà approuvés).`);
    }

    const ds = await getDataSource();
    const repo = ds.getRepository(TicketGrant);
    return repo.save(
      repo.create({
        id: randomUUID(),
        matchTicketCategoryId: mtc.id,
        requestedByUserId,
        recipientName,
        recipientEmail: input.recipientEmail?.trim() || null,
        quantity,
        reason,
        status: "PENDING",
      }),
    );
  }

  async approve(grantId: string, clubId: string, actorUserId: string): Promise<TicketGrant> {
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const grant = await manager.findOne(TicketGrant, { where: { id: grantId }, lock: { mode: "pessimistic_write" } });
      if (!grant) throw new NotFoundError("Demande introuvable");
      if (grant.status !== "PENDING") throw new ForbiddenError("Cette demande n'est plus en attente");
      if (grant.requestedByUserId === actorUserId) {
        throw new ForbiddenError("Le demandeur ne peut pas approuver sa propre demande");
      }

      const { mtc } = await this.resolveOwnedCategory(grant.matchTicketCategoryId, clubId, manager);
      const rule = await manager.findOne(TicketSaleRule, { where: { matchTicketCategoryId: mtc.id } });
      const compQuota = rule?.compQuota ?? 0;
      const alreadyApproved = await this.approvedQuantitySum(mtc.id, grant.id, manager);
      if (alreadyApproved + grant.quantity > compQuota) {
        throw new ForbiddenError(`Quota d'invitations dépassé (${alreadyApproved}/${compQuota} déjà approuvés).`);
      }

      const updateResult = await manager
        .createQueryBuilder()
        .update(MatchTicketCategory)
        .set({ soldCount: () => "sold_count + :qty" })
        .where("id = :id AND sold_count + :qty <= capacity", { id: mtc.id, qty: grant.quantity })
        .execute();
      if (updateResult.affected !== 1) {
        throw new ForbiddenError("Il ne reste plus de place disponible pour cette catégorie.");
      }

      const tickets = Array.from({ length: grant.quantity }, () =>
        manager.create(Ticket, {
          matchId: mtc.matchId,
          matchTicketCategoryId: mtc.id,
          organizerTeamId: clubId,
          purchaserId: grant.requestedByUserId,
          status: "PAID",
          reference: generateTicketReference(),
          price: "0.000",
          source: "GRANT",
          grantId: grant.id,
          paidAt: new Date(),
          declaredAudience: "PUBLIC",
        }),
      );
      const saved = await manager.save(tickets);

      grant.status = "APPROVED";
      grant.approvedByUserId = actorUserId;
      grant.approvedAt = new Date();
      grant.ticketIds = saved.map((t) => t.id);
      return manager.save(grant);
    });
  }

  async reject(grantId: string, clubId: string, actorUserId: string, reason: string): Promise<TicketGrant> {
    const normalized = reason.trim();
    if (normalized.length < 5) throw new ForbiddenError("Un motif de rejet est obligatoire");
    const ds = await getDataSource();
    const grant = await ds.getRepository(TicketGrant).findOne({ where: { id: grantId } });
    if (!grant) throw new NotFoundError("Demande introuvable");
    if (grant.status !== "PENDING") throw new ForbiddenError("Cette demande n'est plus en attente");
    await this.resolveOwnedCategory(grant.matchTicketCategoryId, clubId);
    if (grant.requestedByUserId === actorUserId) {
      throw new ForbiddenError("Le demandeur ne peut pas rejeter sa propre demande");
    }
    grant.status = "REJECTED";
    grant.rejectionReason = normalized;
    return ds.getRepository(TicketGrant).save(grant);
  }

  async listForClub(clubId: string): Promise<TicketGrant[]> {
    const ds = await getDataSource();
    const matches = await ds.getRepository(Match).find({ where: { equipeHome: clubId } });
    if (matches.length === 0) return [];
    const mtcs = await ds.getRepository(MatchTicketCategory).find({ where: { matchId: In(matches.map((m) => m.id)) } });
    if (mtcs.length === 0) return [];
    return ds.getRepository(TicketGrant).find({
      where: { matchTicketCategoryId: In(mtcs.map((m) => m.id)) },
      order: { createdAt: "DESC" },
    });
  }
}
