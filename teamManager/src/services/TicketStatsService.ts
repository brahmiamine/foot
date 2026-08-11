import { getDataSource } from "@/lib/database";
import { Ticket } from "@/entities/Ticket";
import { TicketScan } from "@/entities/TicketScan";
import { TicketCategory } from "@/entities/TicketCategory";
import { TicketingEventCategory } from "@/entities/TicketingEventCategory";

export interface TicketingEventStats {
  issued: number;
  used: number;
  cancelled: number;
  held: number;
  expired: number;
  available: number;
  entryRatePercent: number;
  byCategory: Array<{ categoryId: number; categoryName: string; issued: number; used: number; available: number }>;
  byGate: Array<{ gate: string; count: number }>;
}

/** Service for ticketing dashboard aggregates — comptages en base, jamais calculés côté client. */
export class TicketStatsService {
  async forEvent(ticketingEventId: number, teamId: string): Promise<TicketingEventStats> {
    const dataSource = await getDataSource();
    const ticketRepository = dataSource.getRepository(Ticket);

    const rows = await ticketRepository
      .createQueryBuilder("t")
      .select("t.status", "status")
      .addSelect("t.ticketCategoryId", "categoryId")
      .addSelect("COUNT(*)", "count")
      .where("t.ticketingEventId = :eventId", { eventId: ticketingEventId })
      .andWhere("t.teamId = :teamId", { teamId })
      .groupBy("t.status")
      .addGroupBy("t.ticketCategoryId")
      .getRawMany<{ status: string; categoryId: number; count: string }>();

    let issued = 0;
    let used = 0;
    let cancelled = 0;
    let held = 0;
    let expired = 0;
    const byCategoryMap = new Map<number, { issued: number; used: number }>();

    for (const row of rows) {
      const count = parseInt(row.count, 10);
      const categoryId = Number(row.categoryId);
      const entry = byCategoryMap.get(categoryId) ?? { issued: 0, used: 0 };
      if (row.status === "ISSUED") {
        issued += count;
        entry.issued += count;
      } else if (row.status === "USED") {
        used += count;
        entry.issued += count;
        entry.used += count;
      } else if (row.status === "CANCELLED") cancelled += count;
      else if (row.status === "HELD") held += count;
      else if (row.status === "EXPIRED") expired += count;
      byCategoryMap.set(categoryId, entry);
    }

    const quotaRows = await dataSource
      .getRepository(TicketingEventCategory)
      .createQueryBuilder("tec")
      .select("tec.ticketCategoryId", "categoryId")
      .addSelect("tec.quota", "quota")
      .addSelect("tec.soldCount", "soldCount")
      .where("tec.ticketingEventId = :eventId", { eventId: ticketingEventId })
      .getRawMany<{ categoryId: number; quota: number; soldCount: number }>();

    const categories = await dataSource.getRepository(TicketCategory).find({ where: { teamId } });
    const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

    let available = 0;
    const byCategory = quotaRows.map((q) => {
      const categoryId = Number(q.categoryId);
      const quota = Number(q.quota);
      const sold = Number(q.soldCount);
      const remaining = Math.max(0, quota - sold);
      available += remaining;
      const stats = byCategoryMap.get(categoryId) ?? { issued: 0, used: 0 };
      return {
        categoryId,
        categoryName: categoryNameById.get(categoryId) ?? "?",
        issued: stats.issued,
        used: stats.used,
        available: remaining,
      };
    });

    const totalIssuedOrUsed = issued + used;
    const entryRatePercent = totalIssuedOrUsed > 0 ? Math.round((used / totalIssuedOrUsed) * 100) : 0;

    const gateRows = await dataSource
      .getRepository(TicketScan)
      .createQueryBuilder("scan")
      .select("scan.gate", "gate")
      .addSelect("COUNT(*)", "count")
      .where("scan.teamId = :teamId", { teamId })
      .andWhere("scan.result = 'VALID'")
      .innerJoin(Ticket, "ticket", "ticket.id = scan.ticketId")
      .andWhere("ticket.ticketingEventId = :eventId", { eventId: ticketingEventId })
      .groupBy("scan.gate")
      .getRawMany<{ gate: string | null; count: string }>();

    const byGate = gateRows.map((g) => ({ gate: g.gate ?? "Non renseignée", count: parseInt(g.count, 10) }));

    return { issued, used, cancelled, held, expired, available, entryRatePercent, byCategory, byGate };
  }
}
