import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { seedMatchWithCategory, seedTicket } from "@/test/fixtures";
import { TicketingGovernanceSettings } from "@/entities/TicketingGovernance";
import { Match } from "@/entities/Match";
import { Ticket } from "@/entities/Ticket";

let dataSource: DataSource;

vi.mock("@/lib/database", () => ({ getDataSource: async () => dataSource }));

beforeEach(async () => {
  dataSource = await createTestDataSource();
});
afterEach(async () => dataSource.destroy());

async function setTransferPolicy(clubId: string, enabled: boolean, maxTransfers = 1, deadlineHours = 24) {
  const repo = dataSource.getRepository(TicketingGovernanceSettings);
  await repo.save(
    repo.create({
      clubId,
      saleApprovalRequired: true,
      makerCheckerEnabled: true,
      priceReapprovalRequired: true,
      transferEnabled: enabled,
      transferDeadlineHoursBeforeKickoff: deadlineHours,
      maxTransfersPerTicket: maxTransfers,
      seasonPassDurationDays: 365,
      promotionApprovalRequired: true,
      version: 1,
    }),
  );
}

describe("TicketTransferService — TICK-006", () => {
  it("refuses a transfer when the club has not enabled it", async () => {
    const { TicketTransferService } = await import("./TicketTransferService");
    const { homeTeam, matchTicketCategory } = await seedMatchWithCategory(dataSource);
    const ticket = await seedTicket(dataSource, matchTicketCategory, { status: "PAID", purchaserId: "buyer-1", organizerTeamId: homeTeam.id });

    const service = new TicketTransferService();
    await expect(service.request(ticket.id, "buyer-1", "friend@example.com")).rejects.toThrow("pas activé");
  });

  it("refuses a transfer requested by someone who does not own the ticket", async () => {
    const { TicketTransferService } = await import("./TicketTransferService");
    const { homeTeam, matchTicketCategory } = await seedMatchWithCategory(dataSource);
    await setTransferPolicy(homeTeam.id, true);
    const ticket = await seedTicket(dataSource, matchTicketCategory, { status: "PAID", purchaserId: "buyer-1", organizerTeamId: homeTeam.id });

    const service = new TicketTransferService();
    await expect(service.request(ticket.id, "someone-else", "friend@example.com")).rejects.toThrow("appartient pas");
  });

  it("refuses a transfer request too close to kickoff", async () => {
    const { TicketTransferService } = await import("./TicketTransferService");
    const { homeTeam, matchTicketCategory, match } = await seedMatchWithCategory(dataSource);
    await dataSource.getRepository(Match).update(match.id, { date: new Date(Date.now() + 60 * 60 * 1000) });
    await setTransferPolicy(homeTeam.id, true, 1, 24);
    const ticket = await seedTicket(dataSource, matchTicketCategory, { status: "PAID", purchaserId: "buyer-1", organizerTeamId: homeTeam.id });

    const service = new TicketTransferService();
    await expect(service.request(ticket.id, "buyer-1", "friend@example.com")).rejects.toThrow("délai");
  });

  it("a full request → accept cycle reassigns the ticket and increments transferCount", async () => {
    const { TicketTransferService } = await import("./TicketTransferService");
    const { homeTeam, matchTicketCategory, match } = await seedMatchWithCategory(dataSource);
    await dataSource.getRepository(Match).update(match.id, { date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) });
    await setTransferPolicy(homeTeam.id, true, 1, 24);
    const ticket = await seedTicket(dataSource, matchTicketCategory, { status: "PAID", purchaserId: "buyer-1", organizerTeamId: homeTeam.id });

    const service = new TicketTransferService();
    const requested = await service.request(ticket.id, "buyer-1", "Friend@Example.com");
    expect(requested.status).toBe("PENDING");

    await expect(service.accept(requested.id, "friend-user", "someone-else@example.com")).rejects.toThrow("pas destinée");

    const accepted = await service.accept(requested.id, "friend-user", "friend@example.com");
    expect(accepted.status).toBe("ACCEPTED");
    expect(accepted.toPurchaserId).toBe("friend-user");

    const reloaded = await dataSource.getRepository(Ticket).findOneOrFail({ where: { id: ticket.id } });
    expect(reloaded.purchaserId).toBe("friend-user");
    expect(reloaded.transferCount).toBe(1);
  });

  it("enforces the maximum number of transfers per ticket", async () => {
    const { TicketTransferService } = await import("./TicketTransferService");
    const { homeTeam, matchTicketCategory, match } = await seedMatchWithCategory(dataSource);
    await dataSource.getRepository(Match).update(match.id, { date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) });
    await setTransferPolicy(homeTeam.id, true, 1, 24);
    const ticket = await seedTicket(dataSource, matchTicketCategory, { status: "PAID", purchaserId: "buyer-1", organizerTeamId: homeTeam.id, transferCount: 1 });

    const service = new TicketTransferService();
    await expect(service.request(ticket.id, "buyer-1", "friend@example.com")).rejects.toThrow("maximal");
  });

  it("allows the sender to cancel a pending transfer, but not a third party", async () => {
    const { TicketTransferService } = await import("./TicketTransferService");
    const { homeTeam, matchTicketCategory, match } = await seedMatchWithCategory(dataSource);
    await dataSource.getRepository(Match).update(match.id, { date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) });
    await setTransferPolicy(homeTeam.id, true, 1, 24);
    const ticket = await seedTicket(dataSource, matchTicketCategory, { status: "PAID", purchaserId: "buyer-1", organizerTeamId: homeTeam.id });

    const service = new TicketTransferService();
    const requested = await service.request(ticket.id, "buyer-1", "friend@example.com");
    await expect(service.cancel(requested.id, "someone-else")).rejects.toThrow("expéditeur");
    const cancelled = await service.cancel(requested.id, "buyer-1");
    expect(cancelled.status).toBe("CANCELLED");
  });

  it("refuses a second pending request while one is already outstanding for the same ticket", async () => {
    const { TicketTransferService } = await import("./TicketTransferService");
    const { homeTeam, matchTicketCategory, match } = await seedMatchWithCategory(dataSource);
    await dataSource.getRepository(Match).update(match.id, { date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) });
    await setTransferPolicy(homeTeam.id, true, 2, 24);
    const ticket = await seedTicket(dataSource, matchTicketCategory, { status: "PAID", purchaserId: "buyer-1", organizerTeamId: homeTeam.id });

    const service = new TicketTransferService();
    await service.request(ticket.id, "buyer-1", "friend@example.com");
    await expect(service.request(ticket.id, "buyer-1", "another@example.com")).rejects.toThrow("déjà en attente");
  });
});
