import { getDataSource } from "@/lib/database";
import { TicketingEvent } from "@/entities/TicketingEvent";
import { TicketingEventCategory } from "@/entities/TicketingEventCategory";
import { TicketCategory } from "@/entities/TicketCategory";
import { TicketHold } from "@/entities/TicketHold";
import { Match } from "@/entities/Match";
import { FriendlyMatch } from "@/entities/FriendlyMatch";
import { MoreThan, IsNull, In } from "typeorm";

export interface CategoryAvailability {
  ticketCategoryId: number;
  name: string;
  nameAr: string | null;
  description: string | null;
  price: number;
  color: string | null;
  quota: number;
  available: number;
}

export interface TicketingEventWithMatch {
  event: TicketingEvent;
  matchLabel: string;
  matchDate: Date | null;
  opponentName: string;
  isHome: boolean;
}

/**
 * Service de consultation de la billetterie côté site public. La
 * disponibilité par catégorie est toujours recalculée ici, jamais confiée
 * au frontend : quota - billets vendus (sold_count) - réservations HELD
 * actives non expirées (cms_ticket_holds).
 */
export class TicketingService {
  private async resolveMatchInfo(event: TicketingEvent, obTeamId: string): Promise<{ matchLabel: string; matchDate: Date | null; opponentName: string; isHome: boolean }> {
    const dataSource = await getDataSource();
    if (event.matchType === "OFFICIAL" && event.matchId) {
      const match = await dataSource.getRepository(Match).findOne({ where: { id: event.matchId }, relations: ["homeTeam", "awayTeam"] });
      if (match) {
        const isHome = match.equipeHome === obTeamId;
        const opponentName = (isHome ? match.awayTeam?.nom : match.homeTeam?.nom) ?? "Adversaire";
        return { matchLabel: `${match.homeTeam?.nom ?? "?"} vs ${match.awayTeam?.nom ?? "?"}`, matchDate: match.date ?? null, opponentName, isHome };
      }
    } else if (event.matchType === "FRIENDLY" && event.friendlyMatchId) {
      const friendly = await dataSource.getRepository(FriendlyMatch).findOne({ where: { id: event.friendlyMatchId } });
      if (friendly) {
        return {
          matchLabel: friendly.isHome ? `OB vs ${friendly.opponentName ?? "Adversaire"}` : `${friendly.opponentName ?? "Adversaire"} vs OB`,
          matchDate: friendly.date,
          opponentName: friendly.opponentName ?? "Adversaire",
          isHome: friendly.isHome,
        };
      }
    }
    return { matchLabel: "Match à confirmer", matchDate: null, opponentName: "Adversaire", isHome: true };
  }

  /** Billetteries ouvertes à la vente (statut OPEN, dans la fenêtre de vente si définie). */
  async getOpenEvents(obTeamId: string): Promise<TicketingEventWithMatch[]> {
    const dataSource = await getDataSource();
    const now = new Date();
    const events = await dataSource.getRepository(TicketingEvent).find({ where: { teamId: obTeamId, status: "OPEN" }, order: { id: "DESC" } });

    const withinWindow = events.filter((e) => (!e.salesStartAt || e.salesStartAt <= now) && (!e.salesEndAt || e.salesEndAt >= now));

    return Promise.all(
      withinWindow.map(async (event) => {
        const info = await this.resolveMatchInfo(event, obTeamId);
        return { event, ...info };
      })
    );
  }

  async getEventById(id: number, obTeamId: string): Promise<TicketingEventWithMatch | null> {
    const dataSource = await getDataSource();
    const event = await dataSource.getRepository(TicketingEvent).findOne({ where: { id, teamId: obTeamId } });
    if (!event) return null;
    const info = await this.resolveMatchInfo(event, obTeamId);
    return { event, ...info };
  }

  /** Disponibilité par catégorie, calculée côté serveur (quota - vendus - réservations HELD actives). */
  async getAvailability(ticketingEventId: number): Promise<CategoryAvailability[]> {
    const dataSource = await getDataSource();
    const eventCategories = await dataSource.getRepository(TicketingEventCategory).find({ where: { ticketingEventId, isAvailable: true } });
    if (eventCategories.length === 0) return [];

    const categoryIds = eventCategories.map((ec) => ec.ticketCategoryId);
    const categories = await dataSource.getRepository(TicketCategory).find({ where: { id: In(categoryIds), isActive: true } });
    const categoryById = new Map(categories.map((c) => [c.id, c]));

    const now = new Date();
    const activeHolds = await dataSource.getRepository(TicketHold).find({
      where: { ticketingEventId, releasedAt: IsNull(), expiresAt: MoreThan(now) },
    });
    const heldByCategory = new Map<number, number>();
    for (const hold of activeHolds) {
      heldByCategory.set(hold.ticketCategoryId, (heldByCategory.get(hold.ticketCategoryId) ?? 0) + hold.quantity);
    }

    return eventCategories
      .map((ec) => {
        const category = categoryById.get(ec.ticketCategoryId);
        if (!category) return null;
        const held = heldByCategory.get(ec.ticketCategoryId) ?? 0;
        const available = Math.max(0, ec.quota - ec.soldCount - held);
        return {
          ticketCategoryId: ec.ticketCategoryId,
          name: category.name,
          nameAr: category.nameAr ?? null,
          description: category.description ?? null,
          price: parseFloat(category.price),
          color: category.color ?? null,
          quota: ec.quota,
          available,
        };
      })
      .filter((c): c is CategoryAvailability => c !== null);
  }
}
