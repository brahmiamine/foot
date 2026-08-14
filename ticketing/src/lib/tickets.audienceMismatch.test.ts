import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { seedMatchWithCategory, seedTicket } from "@/test/fixtures";

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

describe("listAudienceMismatchTickets (SQLite réel)", () => {
  it("ne renvoie que les billets flaggés audienceMismatch, avec le contexte match/équipes/catégorie", async () => {
    const { listAudienceMismatchTickets } = await import("./tickets");
    const { matchTicketCategory, homeTeam, awayTeam } = await seedMatchWithCategory(dataSource);
    await seedTicket(dataSource, matchTicketCategory, {
      declaredAudience: "HOME_SUPPORTERS",
      audienceMismatch: true,
    });
    await seedTicket(dataSource, matchTicketCategory, { audienceMismatch: false });

    const rows = await listAudienceMismatchTickets();

    expect(rows).toHaveLength(1);
    expect(rows[0].declaredAudience).toBe("HOME_SUPPORTERS");
    expect(rows[0].homeTeamName).toBe(homeTeam.nom);
    expect(rows[0].awayTeamName).toBe(awayTeam.nom);
    expect(rows[0].categoryName).toBe("Tribune");
  });

  it("filtre par matchId quand fourni", async () => {
    const { listAudienceMismatchTickets } = await import("./tickets");
    const seedA = await seedMatchWithCategory(dataSource);
    const seedB = await seedMatchWithCategory(dataSource);
    const ticketA = await seedTicket(dataSource, seedA.matchTicketCategory, { audienceMismatch: true });
    await seedTicket(dataSource, seedB.matchTicketCategory, { audienceMismatch: true });

    const rows = await listAudienceMismatchTickets(seedA.match.id);

    expect(rows.map((r) => r.id)).toEqual([ticketA.id]);
  });

  it("renvoie un tableau vide s'il n'y a aucun signal", async () => {
    const { listAudienceMismatchTickets } = await import("./tickets");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource);
    await seedTicket(dataSource, matchTicketCategory, { audienceMismatch: false });

    expect(await listAudienceMismatchTickets()).toEqual([]);
  });
});

describe("dismissAudienceMismatch (SQLite réel)", () => {
  it("lève le flag sans modifier le reste du billet", async () => {
    const { dismissAudienceMismatch, listAudienceMismatchTickets } = await import("./tickets");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource);
    const ticket = await seedTicket(dataSource, matchTicketCategory, {
      status: "PAID",
      audienceMismatch: true,
    });

    await dismissAudienceMismatch(ticket.id);

    const remaining = await listAudienceMismatchTickets();
    expect(remaining).toEqual([]);

    const { Ticket } = await import("@/entities/Ticket");
    const reloaded = await dataSource.getRepository(Ticket).findOneOrFail({ where: { id: ticket.id } });
    expect(reloaded.status).toBe("PAID");
    // better-sqlite3 renvoie 0/1 bruts pour `tinyint` (contrairement au driver
    // MySQL réel, qui convertit en booléen) — Boolean(...) isole le
    // comportement testé (le flag est bien retombé) de cette particularité
    // du driver de test.
    expect(Boolean(reloaded.audienceMismatch)).toBe(false);
  });

  it("lève NotFoundError pour un billet inconnu", async () => {
    const { dismissAudienceMismatch } = await import("./tickets");
    await expect(dismissAudienceMismatch("00000000-0000-0000-0000-000000000000")).rejects.toThrow(
      "Billet introuvable.",
    );
  });
});
