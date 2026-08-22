import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { seedMatchWithCategory } from "@/test/fixtures";
import { TicketSaleRule } from "@/entities/TicketSaleRule";
import { Ticket } from "@/entities/Ticket";
import { MatchTicketCategory } from "@/entities/MatchTicketCategory";

let dataSource: DataSource;

vi.mock("@/lib/database", () => ({ getDataSource: async () => dataSource }));

beforeEach(async () => {
  dataSource = await createTestDataSource();
});
afterEach(async () => dataSource.destroy());

async function setCompQuota(matchTicketCategoryId: string, compQuota: number) {
  const repo = dataSource.getRepository(TicketSaleRule);
  const rule = repo.create({
    matchTicketCategoryId,
    allowedAudience: "PUBLIC",
    audienceValidationMode: "DECLARATIVE",
    maxTicketsPerUser: 4,
    compQuota,
    status: "OPEN",
    version: 1,
  });
  await repo.save(rule);
}

describe("TicketGrantService — TICK-003", () => {
  it("rejects a request that exceeds the configured comp quota", async () => {
    const { TicketGrantService } = await import("./TicketGrantService");
    const { homeTeam, matchTicketCategory } = await seedMatchWithCategory(dataSource);
    await setCompQuota(matchTicketCategory.id, 2);

    const service = new TicketGrantService();
    await expect(
      service.request(homeTeam.id, "requester-1", {
        matchTicketCategoryId: matchTicketCategory.id,
        recipientName: "Ami du club",
        quantity: 3,
        reason: "Invitation partenaire",
      }),
    ).rejects.toThrow("Quota");
  });

  it("requires a reason of at least 5 characters", async () => {
    const { TicketGrantService } = await import("./TicketGrantService");
    const { homeTeam, matchTicketCategory } = await seedMatchWithCategory(dataSource);
    await setCompQuota(matchTicketCategory.id, 5);

    const service = new TicketGrantService();
    await expect(
      service.request(homeTeam.id, "requester-1", {
        matchTicketCategoryId: matchTicketCategory.id,
        recipientName: "Ami du club",
        quantity: 1,
        reason: "ok",
      }),
    ).rejects.toThrow("motif");
  });

  it("refuses another club requesting a grant on someone else's match offer", async () => {
    const { TicketGrantService } = await import("./TicketGrantService");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource);
    await setCompQuota(matchTicketCategory.id, 5);

    const service = new TicketGrantService();
    await expect(
      service.request("another-club", "requester-1", {
        matchTicketCategoryId: matchTicketCategory.id,
        recipientName: "Ami du club",
        quantity: 1,
        reason: "Invitation partenaire",
      }),
    ).rejects.toThrow("n'appartient pas");
  });

  it("approve creates PAID GRANT tickets and increments soldCount, but the requester cannot self-approve", async () => {
    const { TicketGrantService } = await import("./TicketGrantService");
    const { homeTeam, matchTicketCategory } = await seedMatchWithCategory(dataSource, { capacity: 10, soldCount: 0 });
    await setCompQuota(matchTicketCategory.id, 5);

    const service = new TicketGrantService();
    const grant = await service.request(homeTeam.id, "requester-1", {
      matchTicketCategoryId: matchTicketCategory.id,
      recipientName: "Ami du club",
      quantity: 3,
      reason: "Invitation partenaire",
    });

    await expect(service.approve(grant.id, homeTeam.id, "requester-1")).rejects.toThrow("propre demande");

    const approved = await service.approve(grant.id, homeTeam.id, "approver-1");
    expect(approved.status).toBe("APPROVED");
    expect(approved.ticketIds).toHaveLength(3);

    const tickets = await dataSource.getRepository(Ticket).find({ where: { grantId: grant.id } });
    expect(tickets).toHaveLength(3);
    expect(tickets.every((t) => t.status === "PAID" && t.source === "GRANT" && Number(t.price) === 0)).toBe(true);

    const reloadedMtc = await dataSource.getRepository(MatchTicketCategory).findOneOrFail({ where: { id: matchTicketCategory.id } });
    expect(reloadedMtc.soldCount).toBe(3);
  });

  it("a second grant that would exceed the quota once combined with an already-approved one is rejected at approval time", async () => {
    const { TicketGrantService } = await import("./TicketGrantService");
    const { homeTeam, matchTicketCategory } = await seedMatchWithCategory(dataSource, { capacity: 10 });
    await setCompQuota(matchTicketCategory.id, 3);

    const service = new TicketGrantService();
    const first = await service.request(homeTeam.id, "requester-1", {
      matchTicketCategoryId: matchTicketCategory.id,
      recipientName: "Premier invité",
      quantity: 2,
      reason: "Invitation partenaire",
    });
    const second = await service.request(homeTeam.id, "requester-2", {
      matchTicketCategoryId: matchTicketCategory.id,
      recipientName: "Second invité",
      quantity: 2,
      reason: "Invitation sponsor",
    });

    await service.approve(first.id, homeTeam.id, "approver-1");
    await expect(service.approve(second.id, homeTeam.id, "approver-1")).rejects.toThrow("Quota");
  });

  it("rejects with a reason, without creating any ticket", async () => {
    const { TicketGrantService } = await import("./TicketGrantService");
    const { homeTeam, matchTicketCategory } = await seedMatchWithCategory(dataSource);
    await setCompQuota(matchTicketCategory.id, 5);

    const service = new TicketGrantService();
    const grant = await service.request(homeTeam.id, "requester-1", {
      matchTicketCategoryId: matchTicketCategory.id,
      recipientName: "Ami du club",
      quantity: 1,
      reason: "Invitation partenaire",
    });
    const rejected = await service.reject(grant.id, homeTeam.id, "approver-1", "Quota déjà consommé ailleurs");
    expect(rejected.status).toBe("REJECTED");
    expect(rejected.rejectionReason).toBe("Quota déjà consommé ailleurs");

    const tickets = await dataSource.getRepository(Ticket).find({ where: { grantId: grant.id } });
    expect(tickets).toHaveLength(0);
  });
});
