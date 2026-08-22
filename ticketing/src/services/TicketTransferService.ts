import { randomUUID } from "node:crypto";
import { getDataSource } from "@/lib/database";
import { Match } from "@/entities/Match";
import { Ticket } from "@/entities/Ticket";
import { TicketTransfer } from "@/entities/TicketTransfer";
import { TicketSaleGovernanceService } from "@/services/TicketSaleGovernanceService";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

const REQUEST_ACCEPTANCE_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * TICK-006 — transfert de billet : activation (le billet ne change de
 * titulaire qu'à l'acceptation, jamais à la demande), deadline (fenêtre
 * d'acceptation + coupure avant coup d'envoi), nombre maximal de transferts
 * (`TicketSaleGovernanceService.maxTransfersPerTicket`), audit (une ligne
 * TicketTransfer par tentative, jamais mutée hors de sa propre
 * progression de statut).
 */
export class TicketTransferService {
  async request(ticketId: string, fromPurchaserId: string, toEmail: string): Promise<TicketTransfer> {
    const normalizedEmail = toEmail.trim().toLowerCase();
    if (!normalizedEmail.includes("@")) throw new ForbiddenError("Adresse e-mail du destinataire invalide");

    const ds = await getDataSource();
    const ticket = await ds.getRepository(Ticket).findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundError("Billet introuvable");
    if (ticket.purchaserId !== fromPurchaserId) throw new ForbiddenError("Ce billet ne vous appartient pas");
    if (ticket.status !== "PAID") throw new ForbiddenError("Seul un billet payé et non utilisé peut être transféré");
    if (ticket.revoked) throw new ForbiddenError("Ce billet est révoqué");

    const match = await ds.getRepository(Match).findOne({ where: { id: ticket.matchId } });
    if (!match) throw new NotFoundError("Match introuvable");

    const settings = await new TicketSaleGovernanceService().getSettings(ticket.organizerTeamId);
    if (!settings.transferEnabled) throw new ForbiddenError("Le transfert de billet n'est pas activé pour ce club");
    if (ticket.transferCount >= settings.maxTransfersPerTicket) {
      throw new ForbiddenError(`Nombre maximal de transferts atteint (${settings.maxTransfersPerTicket})`);
    }

    const now = new Date();
    if (match.date) {
      const cutoff = new Date(match.date.getTime() - settings.transferDeadlineHoursBeforeKickoff * 60 * 60 * 1000);
      if (now.getTime() >= cutoff.getTime()) {
        throw new ForbiddenError("Le délai de transfert avant le coup d'envoi est dépassé");
      }
    }

    const existingPending = await ds.getRepository(TicketTransfer).findOne({ where: { ticketId, status: "PENDING" } });
    if (existingPending) throw new ForbiddenError("Une demande de transfert est déjà en attente pour ce billet");

    const deadline = new Date(
      Math.min(now.getTime() + REQUEST_ACCEPTANCE_WINDOW_MS, match.date ? match.date.getTime() : Infinity),
    );

    const repo = ds.getRepository(TicketTransfer);
    return repo.save(
      repo.create({
        id: randomUUID(),
        ticketId,
        fromPurchaserId,
        toEmail: normalizedEmail,
        status: "PENDING",
        requestedAt: now,
        deadline,
      }),
    );
  }

  async accept(transferId: string, acceptingUserId: string, acceptingEmail: string): Promise<TicketTransfer> {
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const transfer = await manager.findOne(TicketTransfer, { where: { id: transferId }, lock: { mode: "pessimistic_write" } });
      if (!transfer) throw new NotFoundError("Transfert introuvable");
      if (transfer.status !== "PENDING") throw new ForbiddenError("Ce transfert n'est plus en attente");
      if (transfer.deadline.getTime() < Date.now()) {
        transfer.status = "EXPIRED";
        await manager.save(transfer);
        throw new ForbiddenError("Ce transfert a expiré");
      }
      if (transfer.toEmail !== acceptingEmail.trim().toLowerCase()) {
        throw new ForbiddenError("Cette invitation de transfert ne vous est pas destinée");
      }

      const ticketRepo = manager.getRepository(Ticket);
      const ticket = await ticketRepo.findOne({ where: { id: transfer.ticketId } });
      if (!ticket) throw new NotFoundError("Billet introuvable");
      if (ticket.status !== "PAID") throw new ForbiddenError("Ce billet n'est plus transférable");

      ticket.purchaserId = acceptingUserId;
      ticket.transferCount += 1;
      await manager.save(ticket);

      transfer.status = "ACCEPTED";
      transfer.toPurchaserId = acceptingUserId;
      transfer.activatedAt = new Date();
      return manager.save(transfer);
    });
  }

  async cancel(transferId: string, actorUserId: string): Promise<TicketTransfer> {
    const ds = await getDataSource();
    const repo = ds.getRepository(TicketTransfer);
    const transfer = await repo.findOne({ where: { id: transferId } });
    if (!transfer) throw new NotFoundError("Transfert introuvable");
    if (transfer.fromPurchaserId !== actorUserId) throw new ForbiddenError("Seul l'expéditeur peut annuler ce transfert");
    if (transfer.status !== "PENDING") throw new ForbiddenError("Ce transfert n'est plus en attente");
    transfer.status = "CANCELLED";
    transfer.cancelledAt = new Date();
    transfer.cancelledBy = actorUserId;
    return repo.save(transfer);
  }

  async listMine(purchaserId: string): Promise<TicketTransfer[]> {
    const ds = await getDataSource();
    const [sent, received] = await Promise.all([
      ds.getRepository(TicketTransfer).find({ where: { fromPurchaserId: purchaserId }, order: { createdAt: "DESC" } }),
      ds.getRepository(TicketTransfer).find({ where: { toPurchaserId: purchaserId }, order: { createdAt: "DESC" } }),
    ]);
    return [...sent, ...received];
  }
}
