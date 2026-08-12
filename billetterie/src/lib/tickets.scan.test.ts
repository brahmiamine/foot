import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { seedMatchWithCategory, seedTicket } from "@/test/fixtures";
import { Match } from "@/entities/Match";
import { TicketScanLog } from "@/entities/TicketScanLog";

let dataSource: DataSource;

vi.mock("@/lib/database", () => ({
  getDataSource: async () => dataSource,
}));

const envBackup = { ...process.env };

beforeEach(async () => {
  process.env.TICKET_QR_SECRET = "top-secret-for-tests";
  dataSource = await createTestDataSource();
});

afterEach(async () => {
  process.env = { ...envBackup };
  await dataSource.destroy();
});

describe("scanTicket (SQLite réel)", () => {
  it("un billet PAID passe USED au premier scan (SUCCESS)", async () => {
    const { scanTicket } = await import("./tickets");
    const { signTicketToken } = await import("./ticketQr");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource);
    const ticket = await seedTicket(dataSource, matchTicketCategory, { status: "PAID" });
    const token = await signTicketToken(ticket.id);

    const result = await scanTicket(token, "admin-1");

    expect(result.outcome).toBe("SUCCESS");
    expect(result.reference).toBe(ticket.reference);
    expect(result.matchLabel).toContain("Domicile FC");

    const { Ticket } = await import("@/entities/Ticket");
    const reloaded = await dataSource.getRepository(Ticket).findOneOrFail({ where: { id: ticket.id } });
    expect(reloaded.status).toBe("USED");
    expect(reloaded.usedAt).not.toBeNull();
  });

  it("un deuxième scan du même billet renvoie ALREADY_USED (détection double scan)", async () => {
    const { scanTicket } = await import("./tickets");
    const { signTicketToken } = await import("./ticketQr");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource);
    const ticket = await seedTicket(dataSource, matchTicketCategory, { status: "PAID" });
    const token = await signTicketToken(ticket.id);

    await scanTicket(token, "admin-1");
    const second = await scanTicket(token, "admin-2");

    expect(second.outcome).toBe("ALREADY_USED");
    expect(second.usedAt).toBeTruthy();
  });

  it("un billet PENDING renvoie NOT_PAID sans le modifier", async () => {
    const { scanTicket } = await import("./tickets");
    const { signTicketToken } = await import("./ticketQr");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource);
    const ticket = await seedTicket(dataSource, matchTicketCategory, { status: "PENDING" });
    const token = await signTicketToken(ticket.id);

    const result = await scanTicket(token, "admin-1");

    expect(result.outcome).toBe("NOT_PAID");
    const { Ticket } = await import("@/entities/Ticket");
    const reloaded = await dataSource.getRepository(Ticket).findOneOrFail({ where: { id: ticket.id } });
    expect(reloaded.status).toBe("PENDING");
  });

  it("un billet CANCELLED renvoie NOT_PAID", async () => {
    const { scanTicket } = await import("./tickets");
    const { signTicketToken } = await import("./ticketQr");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource);
    const ticket = await seedTicket(dataSource, matchTicketCategory, { status: "CANCELLED" });
    const token = await signTicketToken(ticket.id);

    expect((await scanTicket(token, "admin-1")).outcome).toBe("NOT_PAID");
  });

  it("un billet PAID pour un match CANCELLED renvoie MATCH_CANCELLED, ne le marque pas USED", async () => {
    const { scanTicket } = await import("./tickets");
    const { signTicketToken } = await import("./ticketQr");
    const { matchTicketCategory, match } = await seedMatchWithCategory(dataSource);
    await dataSource.getRepository(Match).update(match.id, { status: "CANCELLED" });
    const ticket = await seedTicket(dataSource, matchTicketCategory, { status: "PAID" });
    const token = await signTicketToken(ticket.id);

    const result = await scanTicket(token, "admin-1");

    expect(result.outcome).toBe("MATCH_CANCELLED");
    const { Ticket } = await import("@/entities/Ticket");
    const reloaded = await dataSource.getRepository(Ticket).findOneOrFail({ where: { id: ticket.id } });
    expect(reloaded.status).toBe("PAID");
  });

  it("un jeton invalide renvoie INVALID et journalise sans ticketId", async () => {
    const { scanTicket } = await import("./tickets");

    const result = await scanTicket("garbage-token", "admin-1");

    expect(result.outcome).toBe("INVALID");
    const logs = await dataSource.getRepository(TicketScanLog).find();
    expect(logs).toHaveLength(1);
    expect(logs[0].ticketId).toBeNull();
    expect(logs[0].result).toBe("INVALID");
  });

  it("chaque scan (succès ou refus) est journalisé dans TicketScanLog", async () => {
    const { scanTicket, listRecentScans } = await import("./tickets");
    const { signTicketToken } = await import("./ticketQr");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource);
    const ticket = await seedTicket(dataSource, matchTicketCategory, { status: "PAID" });
    const token = await signTicketToken(ticket.id);

    await scanTicket(token, "admin-1");
    await scanTicket(token, "admin-2");

    // Les deux scans peuvent tomber dans la même milliseconde en test (SQLite
    // en mémoire) : on ne présume pas de l'ordre relatif entre les deux,
    // seulement que les deux résultats attendus sont bien journalisés.
    const recent = await listRecentScans();
    expect(recent).toHaveLength(2);
    expect(recent.map((r) => r.result).sort()).toEqual(["ALREADY_USED", "SUCCESS"]);
    expect(recent.every((r) => r.reference === ticket.reference)).toBe(true);
  });
});
