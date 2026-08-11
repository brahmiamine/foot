import { getDataSource } from "@/lib/database";
import { TicketCategory } from "@/entities/TicketCategory";
import { TicketingService } from "@/services/TicketingService";
import type { Ticket, TicketStatus } from "@/entities/Ticket";

export interface TicketDisplayInfo {
  id: number;
  ticketNumber: string;
  status: TicketStatus;
  categoryName: string;
  categoryPrice: number;
  matchLabel: string;
  opponentName: string;
  matchDate: string | null;
  holderName: string;
  isHome: boolean;
}

/** Résout les infos d'affichage (catégorie, match) pour une liste de billets — regroupe les lookups pour éviter le N+1. */
export async function resolveTicketDisplayInfo(tickets: Ticket[], teamId: string): Promise<TicketDisplayInfo[]> {
  if (tickets.length === 0) return [];

  const dataSource = await getDataSource();
  const categories = await dataSource.getRepository(TicketCategory).find({ where: { teamId } });
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));
  const categoryPriceById = new Map(categories.map((c) => [c.id, parseFloat(c.price)]));

  const ticketingService = new TicketingService();
  const eventIds = [...new Set(tickets.map((t) => t.ticketingEventId))];
  const eventInfoById = new Map(
    await Promise.all(
      eventIds.map(async (id) => {
        const info = await ticketingService.getEventById(id, teamId);
        return [id, info] as const;
      })
    )
  );

  return tickets.map((t) => {
    const info = eventInfoById.get(t.ticketingEventId);
    return {
      id: t.id,
      ticketNumber: t.ticketNumber,
      status: t.status,
      categoryName: categoryNameById.get(t.ticketCategoryId) ?? "?",
      categoryPrice: categoryPriceById.get(t.ticketCategoryId) ?? 0,
      matchLabel: info?.matchLabel ?? "Match",
      opponentName: info?.opponentName ?? "Adversaire",
      matchDate: info?.matchDate ? info.matchDate.toISOString() : null,
      holderName: [t.holderFirstName, t.holderLastName].filter(Boolean).join(" "),
      isHome: info?.isHome ?? true,
    };
  });
}
