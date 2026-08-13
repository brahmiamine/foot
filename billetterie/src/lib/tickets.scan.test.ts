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

  it("un billet révoqué renvoie REVOKED même s'il est PAID, sans le marquer USED (TASK-P0-009)", async () => {
    const { scanTicket, revokeTicket } = await import("./tickets");
    const { signTicketToken } = await import("./ticketQr");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource);
    const ticket = await seedTicket(dataSource, matchTicketCategory, { status: "PAID" });
    const token = await signTicketToken(ticket.id);

    await revokeTicket(ticket.id, "admin-1", "fraude suspectée");
    const result = await scanTicket(token, "admin-2");

    expect(result.outcome).toBe("REVOKED");
    const { Ticket } = await import("@/entities/Ticket");
    const reloaded = await dataSource.getRepository(Ticket).findOneOrFail({ where: { id: ticket.id } });
    expect(reloaded.status).toBe("PAID");
    expect(reloaded.revokedReason).toBe("fraude suspectée");
    expect(reloaded.revokedBy).toBe("admin-1");
  });

  it("annuler une révocation (unrevokeTicket) rend le billet de nouveau scannable", async () => {
    const { scanTicket, revokeTicket, unrevokeTicket } = await import("./tickets");
    const { signTicketToken } = await import("./ticketQr");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource);
    const ticket = await seedTicket(dataSource, matchTicketCategory, { status: "PAID" });
    const token = await signTicketToken(ticket.id);

    await revokeTicket(ticket.id, "admin-1");
    await unrevokeTicket(ticket.id);
    const result = await scanTicket(token, "admin-2");

    expect(result.outcome).toBe("SUCCESS");
  });

  it("getOfflineScanManifest exclut les billets révoqués (TASK-P0-009)", async () => {
    const { revokeTicket, getOfflineScanManifest } = await import("./tickets");
    const { matchTicketCategory, match } = await seedMatchWithCategory(dataSource);
    const paidTicket = await seedTicket(dataSource, matchTicketCategory, { status: "PAID" });
    const revokedTicket = await seedTicket(dataSource, matchTicketCategory, { status: "PAID" });
    await revokeTicket(revokedTicket.id, "admin-1");

    const manifest = await getOfflineScanManifest(match.id);

    const ids = manifest.tickets.map((t) => t.ticketId);
    expect(ids).toContain(paidTicket.id);
    expect(ids).not.toContain(revokedTicket.id);
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

/** TASK-P0-008 : synchro batch multi-scanner (deux terminaux, un seul billet physique). */
describe("syncScans (SQLite réel)", () => {
  it("deux terminaux synchronisent le même billet dans deux lots séparés : 1 accepted, puis 1 conflict avec le terminal gagnant", async () => {
    const { syncScans } = await import("./tickets");
    const { signTicketToken } = await import("./ticketQr");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource);
    const ticket = await seedTicket(dataSource, matchTicketCategory, { status: "PAID" });
    const token = await signTicketToken(ticket.id);

    const first = await syncScans([{ token, terminalId: "terminal-A" }], "admin-1");
    expect(first.accepted).toHaveLength(1);
    expect(first.conflicts).toHaveLength(0);

    const second = await syncScans([{ token, terminalId: "terminal-B" }], "admin-1");
    expect(second.accepted).toHaveLength(0);
    expect(second.conflicts).toHaveLength(1);
    expect(second.conflicts[0].outcome).toBe("ALREADY_USED");
    expect(second.conflicts[0].usedByTerminalId).toBe("terminal-A");
  });

  it("un même lot contenant deux fois le même billet (deux scans hors-ligne du même terminal) : 1 accepted, 1 conflict", async () => {
    const { syncScans } = await import("./tickets");
    const { signTicketToken } = await import("./ticketQr");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource);
    const ticket = await seedTicket(dataSource, matchTicketCategory, { status: "PAID" });
    const token = await signTicketToken(ticket.id);

    const result = await syncScans(
      [
        { token, terminalId: "terminal-A" },
        { token, terminalId: "terminal-A" },
      ],
      "admin-1",
    );

    expect(result.accepted).toHaveLength(1);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].usedByTerminalId).toBe("terminal-A");
  });

  it("un lot mixte (billets distincts) accepte chaque billet indépendamment", async () => {
    const { syncScans } = await import("./tickets");
    const { signTicketToken } = await import("./ticketQr");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource);
    const ticketA = await seedTicket(dataSource, matchTicketCategory, { status: "PAID" });
    const ticketB = await seedTicket(dataSource, matchTicketCategory, { status: "PAID" });
    const tokenA = await signTicketToken(ticketA.id);
    const tokenB = await signTicketToken(ticketB.id);

    const result = await syncScans(
      [
        { token: tokenA, terminalId: "terminal-A" },
        { token: tokenB, terminalId: "terminal-B" },
      ],
      "admin-1",
    );

    expect(result.accepted).toHaveLength(2);
    expect(result.conflicts).toHaveLength(0);
  });

  it("un billet non payé dans le lot ressort en conflict avec l'outcome NOT_PAID", async () => {
    const { syncScans } = await import("./tickets");
    const { signTicketToken } = await import("./ticketQr");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource);
    const ticket = await seedTicket(dataSource, matchTicketCategory, { status: "PENDING" });
    const token = await signTicketToken(ticket.id);

    const result = await syncScans([{ token, terminalId: "terminal-A" }], "admin-1");

    expect(result.accepted).toHaveLength(0);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].outcome).toBe("NOT_PAID");
  });
});
