import { getDataSource } from "@/lib/database";
import { TicketOrder, TicketOrderStatus } from "@/entities/TicketOrder";
import { TicketOrderItem } from "@/entities/TicketOrderItem";
import { Ticket } from "@/entities/Ticket";
import { Repository } from "typeorm";

/**
 * Service for TicketOrder operations, côté admin (teamManager) — lecture
 * seule sur le cycle de vie de la commande : la création/confirmation a
 * lieu sur `ob` (le site public, où l'achat se déroule).
 */
export class TicketOrderService {
  private async getRepository(): Promise<Repository<TicketOrder>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(TicketOrder);
  }

  async findAll(teamId: string, filters?: { ticketingEventId?: number; status?: TicketOrderStatus }): Promise<TicketOrder[]> {
    const repository = await this.getRepository();
    return repository.find({
      where: {
        teamId,
        ...(filters?.ticketingEventId ? { ticketingEventId: filters.ticketingEventId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      order: { createdAt: "DESC" },
    });
  }

  async findById(id: number, teamId: string): Promise<TicketOrder | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id, teamId } });
  }

  async findItems(orderId: number): Promise<TicketOrderItem[]> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(TicketOrderItem).find({ where: { orderId } });
  }

  async findTickets(orderId: number): Promise<Ticket[]> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Ticket).find({ where: { orderId }, order: { id: "ASC" } });
  }
}
