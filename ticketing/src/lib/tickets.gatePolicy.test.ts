import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { seedMatchWithCategory, seedTicket } from "@/test/fixtures";
import { TicketingGovernanceSettings } from "@/entities/TicketingGovernance";
import { Match } from "@/entities/Match";

let dataSource: DataSource;

vi.mock("@/lib/database", () => ({ getDataSource: async () => dataSource }));

const envBackup = { ...process.env };

beforeEach(async () => {
  process.env.TICKET_QR_SECRET = "top-secret-for-tests";
  dataSource = await createTestDataSource();
});

afterEach(async () => {
  process.env = { ...envBackup };
  await dataSource.destroy();
});

async function setGatePolicy(clubId: string, openMinutes: number | null, closeMinutes: number | null) {
  const repo = dataSource.getRepository(TicketingGovernanceSettings);
  await repo.save(
    repo.create({
      clubId,
      saleApprovalRequired: true,
      makerCheckerEnabled: true,
      priceReapprovalRequired: true,
      gateOpenMinutesBeforeKickoff: openMinutes,
      gateCloseMinutesAfterKickoff: closeMinutes,
      transferEnabled: false,
      transferDeadlineHoursBeforeKickoff: 24,
      maxTransfersPerTicket: 1,
      seasonPassDurationDays: 365,
      promotionApprovalRequired: true,
      version: 1,
    }),
  );
}

describe("scanTicket — TICK-005 gate window", () => {
  it("without a configured policy, scanning works at any time (legacy behaviour)", async () => {
    const { scanTicket } = await import("./tickets");
    const { signTicketToken } = await import("./ticketQr");
    const { homeTeam, matchTicketCategory, match } = await seedMatchWithCategory(dataSource);
    await dataSource.getRepository(Match).update(match.id, { date: new Date(Date.now() + 6 * 60 * 60 * 1000) });
    const ticket = await seedTicket(dataSource, matchTicketCategory, { status: "PAID", organizerTeamId: homeTeam.id });
    const token = await signTicketToken(ticket.id);

    const result = await scanTicket(token, "admin-1");
    expect(result.outcome).toBe("SUCCESS");
  });

  it("rejects a scan attempted well before the gates open", async () => {
    const { scanTicket } = await import("./tickets");
    const { signTicketToken } = await import("./ticketQr");
    const { homeTeam, matchTicketCategory, match } = await seedMatchWithCategory(dataSource);
    await dataSource.getRepository(Match).update(match.id, { date: new Date(Date.now() + 6 * 60 * 60 * 1000) });
    await setGatePolicy(homeTeam.id, 60, 45);
    const ticket = await seedTicket(dataSource, matchTicketCategory, { status: "PAID", organizerTeamId: homeTeam.id });
    const token = await signTicketToken(ticket.id);

    const result = await scanTicket(token, "admin-1");
    expect(result.outcome).toBe("GATE_CLOSED");

    const { Ticket } = await import("@/entities/Ticket");
    const reloaded = await dataSource.getRepository(Ticket).findOneOrFail({ where: { id: ticket.id } });
    expect(reloaded.status).toBe("PAID");
  });

  it("accepts a scan within the configured gate window", async () => {
    const { scanTicket } = await import("./tickets");
    const { signTicketToken } = await import("./ticketQr");
    const { homeTeam, matchTicketCategory, match } = await seedMatchWithCategory(dataSource);
    await dataSource.getRepository(Match).update(match.id, { date: new Date(Date.now() + 30 * 60 * 1000) });
    await setGatePolicy(homeTeam.id, 60, 45);
    const ticket = await seedTicket(dataSource, matchTicketCategory, { status: "PAID", organizerTeamId: homeTeam.id });
    const token = await signTicketToken(ticket.id);

    const result = await scanTicket(token, "admin-1");
    expect(result.outcome).toBe("SUCCESS");
  });

  it("rejects a scan attempted after the gates have closed", async () => {
    const { scanTicket } = await import("./tickets");
    const { signTicketToken } = await import("./ticketQr");
    const { homeTeam, matchTicketCategory, match } = await seedMatchWithCategory(dataSource);
    await dataSource.getRepository(Match).update(match.id, { date: new Date(Date.now() - 3 * 60 * 60 * 1000) });
    await setGatePolicy(homeTeam.id, 60, 45);
    const ticket = await seedTicket(dataSource, matchTicketCategory, { status: "PAID", organizerTeamId: homeTeam.id });
    const token = await signTicketToken(ticket.id);

    const result = await scanTicket(token, "admin-1");
    expect(result.outcome).toBe("GATE_CLOSED");
  });

  it("a revoked ticket is still reported as REVOKED, not masked by a closed gate", async () => {
    const { scanTicket, revokeTicket } = await import("./tickets");
    const { signTicketToken } = await import("./ticketQr");
    const { homeTeam, matchTicketCategory, match } = await seedMatchWithCategory(dataSource);
    await dataSource.getRepository(Match).update(match.id, { date: new Date(Date.now() + 6 * 60 * 60 * 1000) });
    await setGatePolicy(homeTeam.id, 60, 45);
    const ticket = await seedTicket(dataSource, matchTicketCategory, { status: "PAID", organizerTeamId: homeTeam.id });
    const token = await signTicketToken(ticket.id);
    await revokeTicket(ticket.id, "admin-1", "fraude");

    const result = await scanTicket(token, "admin-2");
    expect(result.outcome).toBe("REVOKED");
  });
});

describe("getOfflineScanManifest — TICK-005 manifest validity", () => {
  it("exposes expiresAt when a validity policy is configured, null otherwise", async () => {
    const { getOfflineScanManifest } = await import("./tickets");
    const { homeTeam, match } = await seedMatchWithCategory(dataSource);

    const withoutPolicy = await getOfflineScanManifest(match.id);
    expect(withoutPolicy.expiresAt).toBeNull();

    await setGatePolicy(homeTeam.id, null, null);
    await dataSource.getRepository(TicketingGovernanceSettings).update({ clubId: homeTeam.id }, { offlineManifestValidityMinutes: 240 });
    const withPolicy = await getOfflineScanManifest(match.id);
    expect(withPolicy.expiresAt).not.toBeNull();
    expect(new Date(withPolicy.expiresAt!).getTime()).toBeGreaterThan(new Date(withPolicy.generatedAt).getTime());
  });
});
