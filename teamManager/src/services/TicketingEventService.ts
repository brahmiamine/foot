import { getDataSource } from "@/lib/database";
import { TicketingEvent, TicketingEventStatus } from "@/entities/TicketingEvent";
import { TicketingEventCategory } from "@/entities/TicketingEventCategory";
import { Repository } from "typeorm";
import type { CreateTicketingEventInput, UpdateTicketingEventInput } from "@/types/ticketing";

const ALLOWED_TRANSITIONS: Record<TicketingEventStatus, TicketingEventStatus[]> = {
  DRAFT: ["SCHEDULED", "OPEN", "CANCELLED"],
  SCHEDULED: ["OPEN", "CANCELLED"],
  OPEN: ["CLOSED", "CANCELLED"],
  CLOSED: [],
  CANCELLED: [],
};

/**
 * Service for TicketingEvent operations — la billetterie d'un match
 * (référence match officiel OU amical, jamais les deux). Les quotas par
 * catégorie sont gérés ici via `cms_ticketing_event_categories` ; `sold_count`
 * n'est jamais modifié depuis teamManager (il l'est uniquement par `ob` lors
 * d'un achat, sous transaction — voir ob/src/services/TicketPurchaseService.ts).
 */
export class TicketingEventService {
  private async getRepository(): Promise<Repository<TicketingEvent>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(TicketingEvent);
  }

  private async getEventCategoryRepository(): Promise<Repository<TicketingEventCategory>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(TicketingEventCategory);
  }

  async findAll(teamId: string): Promise<TicketingEvent[]> {
    const repository = await this.getRepository();
    return repository.find({
      where: { teamId },
      relations: ["match", "match.homeTeam", "match.awayTeam", "friendlyMatch", "friendlyMatch.opponentTeam"],
      order: { createdAt: "DESC" },
    });
  }

  async findById(id: number, teamId: string): Promise<TicketingEvent | null> {
    const repository = await this.getRepository();
    return repository.findOne({
      where: { id, teamId },
      relations: ["match", "match.homeTeam", "match.awayTeam", "friendlyMatch", "friendlyMatch.opponentTeam"],
    });
  }

  async findCategories(ticketingEventId: number): Promise<TicketingEventCategory[]> {
    const repository = await this.getEventCategoryRepository();
    return repository.find({ where: { ticketingEventId }, order: { id: "ASC" } });
  }

  private async assertNoExistingEvent(matchType: "OFFICIAL" | "FRIENDLY", matchId: string | null | undefined, friendlyMatchId: number | null | undefined, teamId: string, excludeId?: number) {
    const repository = await this.getRepository();
    const where = matchType === "OFFICIAL" ? { teamId, matchId: matchId ?? undefined } : { teamId, friendlyMatchId: friendlyMatchId ?? undefined };
    const existing = await repository.findOne({ where });
    if (existing && existing.id !== excludeId) {
      throw new Error("Une billetterie existe déjà pour ce match");
    }
  }

  async create(data: CreateTicketingEventInput, teamId: string, createdBy: string): Promise<TicketingEvent> {
    await this.assertNoExistingEvent(data.matchType, data.matchId, data.friendlyMatchId, teamId);

    const repository = await this.getRepository();
    const event = repository.create({
      teamId,
      matchType: data.matchType,
      matchId: data.matchType === "OFFICIAL" ? data.matchId : null,
      friendlyMatchId: data.matchType === "FRIENDLY" ? data.friendlyMatchId : null,
      status: "DRAFT",
      salesStartAt: data.salesStartAt ?? null,
      salesEndAt: data.salesEndAt ?? null,
      maxTicketsPerOrder: data.maxTicketsPerOrder,
      createdBy,
    });
    const saved = await repository.save(event);

    if (data.categories.length > 0) {
      const eventCategoryRepository = await this.getEventCategoryRepository();
      const rows = data.categories.map((c) =>
        eventCategoryRepository.create({
          ticketingEventId: saved.id,
          ticketCategoryId: c.ticketCategoryId,
          quota: c.quota,
          soldCount: 0,
          isAvailable: true,
        })
      );
      await eventCategoryRepository.save(rows);
    }

    return saved;
  }

  async update(id: number, teamId: string, data: UpdateTicketingEventInput): Promise<TicketingEvent> {
    const repository = await this.getRepository();
    const event = await repository.findOne({ where: { id, teamId } });
    if (!event) {
      throw new Error("Billetterie non trouvée");
    }
    if (data.salesStartAt !== undefined) event.salesStartAt = data.salesStartAt;
    if (data.salesEndAt !== undefined) event.salesEndAt = data.salesEndAt;
    if (data.maxTicketsPerOrder !== undefined) event.maxTicketsPerOrder = data.maxTicketsPerOrder;
    return repository.save(event);
  }

  async setStatus(id: number, teamId: string, status: TicketingEventStatus): Promise<TicketingEvent> {
    const repository = await this.getRepository();
    const event = await repository.findOne({ where: { id, teamId } });
    if (!event) {
      throw new Error("Billetterie non trouvée");
    }
    if (!ALLOWED_TRANSITIONS[event.status].includes(status)) {
      throw new Error(`Transition non autorisée : ${event.status} → ${status}`);
    }
    event.status = status;
    return repository.save(event);
  }

  /** Crée ou met à jour le quota d'une catégorie pour cette billetterie. */
  async setCategoryQuota(
    ticketingEventId: number,
    teamId: string,
    data: { ticketCategoryId: number; quota: number; isAvailable: boolean }
  ): Promise<TicketingEventCategory> {
    const eventRepository = await this.getRepository();
    const event = await eventRepository.findOne({ where: { id: ticketingEventId, teamId } });
    if (!event) {
      throw new Error("Billetterie non trouvée");
    }

    const repository = await this.getEventCategoryRepository();
    let row = await repository.findOne({ where: { ticketingEventId, ticketCategoryId: data.ticketCategoryId } });
    if (row) {
      if (data.quota < row.soldCount) {
        throw new Error(`Le quota ne peut pas être inférieur au nombre de billets déjà vendus (${row.soldCount})`);
      }
      row.quota = data.quota;
      row.isAvailable = data.isAvailable;
    } else {
      row = repository.create({
        ticketingEventId,
        ticketCategoryId: data.ticketCategoryId,
        quota: data.quota,
        soldCount: 0,
        isAvailable: data.isAvailable,
      });
    }
    return repository.save(row);
  }

  async removeCategory(ticketingEventId: number, teamId: string, ticketCategoryId: number): Promise<boolean> {
    const eventRepository = await this.getRepository();
    const event = await eventRepository.findOne({ where: { id: ticketingEventId, teamId } });
    if (!event) {
      throw new Error("Billetterie non trouvée");
    }
    const repository = await this.getEventCategoryRepository();
    const row = await repository.findOne({ where: { ticketingEventId, ticketCategoryId } });
    if (!row) return false;
    if (row.soldCount > 0) {
      throw new Error("Impossible de retirer une catégorie ayant déjà des billets vendus");
    }
    await repository.remove(row);
    return true;
  }

  async delete(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getRepository();
    const event = await repository.findOne({ where: { id, teamId } });
    if (!event) {
      throw new Error("Billetterie non trouvée");
    }
    if (event.status !== "DRAFT") {
      throw new Error("Seule une billetterie en brouillon peut être supprimée");
    }
    await repository.remove(event);
    return true;
  }
}
