import { createHash } from "node:crypto";
import { getDataSource } from "@/lib/database";
import { Ticket, TicketStatus } from "@/entities/Ticket";
import { TicketScan, TicketScanResult } from "@/entities/TicketScan";
import { TicketingEventCategory } from "@/entities/TicketingEventCategory";
import { Like, Repository } from "typeorm";

export function hashTicketToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface ScanOutcome {
  result: TicketScanResult;
  ticket: Ticket | null;
}

/**
 * Service for Ticket operations côté admin (teamManager) : recherche,
 * annulation, et surtout la validation de scan au contrôle d'entrée.
 *
 * La validation de scan doit être atomique : deux contrôleurs qui
 * scanneraient le même billet en même temps ne doivent jamais pouvoir tous
 * les deux le valider. On verrouille donc la ligne du billet
 * (`pessimistic_write`) à l'intérieur d'une transaction avant de lire son
 * statut et de le faire passer à USED — le second scan concurrent attend le
 * verrou, relit le statut déjà "USED" par le premier, et ressort
 * ALREADY_USED au lieu de valider deux fois le même billet.
 */
export class TicketService {
  private async getRepository(): Promise<Repository<Ticket>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Ticket);
  }

  async findAll(teamId: string, filters?: { ticketingEventId?: number; status?: TicketStatus; search?: string }): Promise<Ticket[]> {
    const repository = await this.getRepository();
    return repository.find({
      where: {
        teamId,
        ...(filters?.ticketingEventId ? { ticketingEventId: filters.ticketingEventId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.search ? { ticketNumber: Like(`%${filters.search}%`) } : {}),
      },
      order: { id: "DESC" },
      take: 500,
    });
  }

  async findById(id: number, teamId: string): Promise<Ticket | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id, teamId } });
  }

  /** Annule un billet émis. Rejeté immédiatement si présenté au scan ensuite. */
  async cancel(id: number, teamId: string): Promise<Ticket> {
    const dataSource = await getDataSource();
    return dataSource.transaction(async (manager) => {
      const ticket = await manager.findOne(Ticket, { where: { id, teamId }, lock: { mode: "pessimistic_write" } });
      if (!ticket) {
        throw new Error("Billet non trouvé");
      }
      if (ticket.status === "USED") {
        throw new Error("Ce billet a déjà été utilisé, il ne peut plus être annulé");
      }
      if (ticket.status === "CANCELLED") {
        return ticket;
      }
      ticket.status = "CANCELLED";
      ticket.cancelledAt = new Date();
      return manager.save(ticket);
    });
  }

  /**
   * Valide un scan de billet au contrôle d'entrée. `expectedEventId` est la
   * billetterie du jour (celle du match day en cours) : un billet valide
   * mais émis pour une autre billetterie est rejeté (WRONG_EVENT).
   */
  async validateScan(
    token: string,
    teamId: string,
    expectedEventId: number,
    controllerUserId: string,
    gate: string | null,
    deviceId: string | null
  ): Promise<ScanOutcome> {
    const tokenHash = hashTicketToken(token);
    const dataSource = await getDataSource();

    return dataSource.transaction(async (manager) => {
      const ticket = await manager.findOne(Ticket, {
        where: { tokenHash, teamId },
        lock: { mode: "pessimistic_write" },
      });

      let result: TicketScanResult;
      if (!ticket) {
        result = "INVALID";
      } else if (ticket.ticketingEventId !== expectedEventId) {
        result = "WRONG_EVENT";
      } else if (ticket.status === "USED") {
        result = "ALREADY_USED";
      } else if (ticket.status === "CANCELLED") {
        result = "CANCELLED";
      } else if (ticket.status === "EXPIRED" || ticket.status === "HELD") {
        result = "EXPIRED";
      } else {
        result = "VALID";
        ticket.status = "USED";
        ticket.usedAt = new Date();
        await manager.save(ticket);
      }

      const scan = manager.create(TicketScan, {
        teamId,
        ticketId: ticket?.id ?? 0,
        controllerUserId,
        gate,
        result,
        deviceId,
      });
      if (ticket) {
        await manager.save(scan);
      }

      return { result, ticket: result === "VALID" || result === "ALREADY_USED" || result === "CANCELLED" || result === "WRONG_EVENT" || result === "EXPIRED" ? ticket : null };
    });
  }

  async findScans(teamId: string, filters?: { ticketingEventId?: number }): Promise<TicketScan[]> {
    const dataSource = await getDataSource();
    if (!filters?.ticketingEventId) {
      return dataSource.getRepository(TicketScan).find({ where: { teamId }, order: { scannedAt: "DESC" }, take: 500 });
    }
    return dataSource
      .getRepository(TicketScan)
      .createQueryBuilder("scan")
      .innerJoin(Ticket, "ticket", "ticket.id = scan.ticketId")
      .where("scan.teamId = :teamId", { teamId })
      .andWhere("ticket.ticketingEventId = :eventId", { eventId: filters.ticketingEventId })
      .orderBy("scan.scannedAt", "DESC")
      .take(500)
      .getMany();
  }

  async findQuotaByEvent(ticketingEventId: number): Promise<TicketingEventCategory[]> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(TicketingEventCategory).find({ where: { ticketingEventId } });
  }
}
