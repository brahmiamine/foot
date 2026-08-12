import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { seedMatchWithCategory, seedTicket } from "@/test/fixtures";
import { Ticket } from "@/entities/Ticket";
import { MatchTicketCategory } from "@/entities/MatchTicketCategory";

let dataSource: DataSource;

vi.mock("@/lib/database", () => ({
  getDataSource: async () => dataSource,
}));

beforeEach(async () => {
  dataSource = await createTestDataSource();
});

afterEach(async () => {
  await dataSource.destroy();
});

/** Recule la date de création d'un billet, en contournant @CreateDateColumn (voir src/test/fixtures.ts). */
async function backdateCreatedAt(ticketId: string, date: Date) {
  await dataSource
    .getRepository(Ticket)
    .createQueryBuilder()
    .update(Ticket)
    .set({ createdAt: date })
    .where("id = :id", { id: ticketId })
    .execute();
}

describe("purgeStalePendingTickets (SQLite réel)", () => {
  it("libère un billet PENDING créé il y a plus de 30 minutes et décrémente soldCount", async () => {
    const { purgeStalePendingTickets } = await import("./tickets");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource, { soldCount: 1 });
    const stale = await seedTicket(dataSource, matchTicketCategory, { status: "PENDING" });
    await backdateCreatedAt(stale.id, new Date(Date.now() - 31 * 60 * 1000));

    const result = await purgeStalePendingTickets();

    expect(result).toEqual({ releasedTickets: 1, releasedCategories: 1 });
    const reloaded = await dataSource.getRepository(Ticket).findOneOrFail({ where: { id: stale.id } });
    expect(reloaded.status).toBe("CANCELLED");
    const reloadedCategory = await dataSource
      .getRepository(MatchTicketCategory)
      .findOneOrFail({ where: { id: matchTicketCategory.id } });
    expect(reloadedCategory.soldCount).toBe(0);
  });

  it("ne touche pas un billet PENDING récent (moins de 30 minutes)", async () => {
    const { purgeStalePendingTickets } = await import("./tickets");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource, { soldCount: 1 });
    const fresh = await seedTicket(dataSource, matchTicketCategory, { status: "PENDING" });
    await backdateCreatedAt(fresh.id, new Date(Date.now() - 5 * 60 * 1000));

    const result = await purgeStalePendingTickets();

    expect(result).toEqual({ releasedTickets: 0, releasedCategories: 0 });
    const reloaded = await dataSource.getRepository(Ticket).findOneOrFail({ where: { id: fresh.id } });
    expect(reloaded.status).toBe("PENDING");
  });

  it("ne touche jamais un billet déjà PAID, même ancien", async () => {
    const { purgeStalePendingTickets } = await import("./tickets");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource, { soldCount: 1 });
    const paid = await seedTicket(dataSource, matchTicketCategory, { status: "PAID" });
    await backdateCreatedAt(paid.id, new Date(Date.now() - 60 * 60 * 1000));

    const result = await purgeStalePendingTickets();

    expect(result).toEqual({ releasedTickets: 0, releasedCategories: 0 });
    const reloaded = await dataSource.getRepository(Ticket).findOneOrFail({ where: { id: paid.id } });
    expect(reloaded.status).toBe("PAID");
  });

  it("est idempotente : ré-exécuter sur des billets déjà CANCELLED ne change rien", async () => {
    const { purgeStalePendingTickets } = await import("./tickets");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource, { soldCount: 0 });
    const cancelled = await seedTicket(dataSource, matchTicketCategory, { status: "CANCELLED" });
    await backdateCreatedAt(cancelled.id, new Date(Date.now() - 60 * 60 * 1000));

    const first = await purgeStalePendingTickets();
    const second = await purgeStalePendingTickets();

    expect(first).toEqual({ releasedTickets: 0, releasedCategories: 0 });
    expect(second).toEqual({ releasedTickets: 0, releasedCategories: 0 });
  });

  it("regroupe plusieurs billets périmés de la même catégorie en un seul comptage de catégorie", async () => {
    const { purgeStalePendingTickets } = await import("./tickets");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource, { soldCount: 2 });
    const staleA = await seedTicket(dataSource, matchTicketCategory, { status: "PENDING" });
    const staleB = await seedTicket(dataSource, matchTicketCategory, { status: "PENDING" });
    await backdateCreatedAt(staleA.id, new Date(Date.now() - 45 * 60 * 1000));
    await backdateCreatedAt(staleB.id, new Date(Date.now() - 40 * 60 * 1000));

    const result = await purgeStalePendingTickets();

    expect(result).toEqual({ releasedTickets: 2, releasedCategories: 1 });
    const reloadedCategory = await dataSource
      .getRepository(MatchTicketCategory)
      .findOneOrFail({ where: { id: matchTicketCategory.id } });
    expect(reloadedCategory.soldCount).toBe(0);
  });
});
