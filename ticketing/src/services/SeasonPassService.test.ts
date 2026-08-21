import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { seedMatchWithCategory } from "@/test/fixtures";
import { MatchTicketCategory } from "@/entities/MatchTicketCategory";

let dataSource: DataSource;

vi.mock("@/lib/database", () => ({ getDataSource: async () => dataSource }));

beforeEach(async () => {
  dataSource = await createTestDataSource();
});
afterEach(async () => dataSource.destroy());

describe("SeasonPassService — TICK-007", () => {
  it("purchases a season pass covering a club's category", async () => {
    const { SeasonPassService } = await import("./SeasonPassService");
    const { homeTeam, category } = await seedMatchWithCategory(dataSource);
    const service = new SeasonPassService();

    const pass = await service.purchase(homeTeam.id, category.id, "buyer-1");
    expect(pass.status).toBe("ACTIVE");
    expect(pass.categoryId).toBe(category.id);
    expect(pass.expiresAt.getTime()).toBeGreaterThan(pass.startsAt.getTime());
  });

  it("rejects a purchase for a category belonging to another club", async () => {
    const { SeasonPassService } = await import("./SeasonPassService");
    const { category } = await seedMatchWithCategory(dataSource);
    const service = new SeasonPassService();
    await expect(service.purchase("another-club", category.id, "buyer-1")).rejects.toThrow("introuvable");
  });

  it("redeems a ticket for a covered match, once per match only", async () => {
    const { SeasonPassService } = await import("./SeasonPassService");
    const { homeTeam, category, matchTicketCategory } = await seedMatchWithCategory(dataSource, { capacity: 10 });
    const service = new SeasonPassService();
    const pass = await service.purchase(homeTeam.id, category.id, "buyer-1");

    const ticket = await service.redeem(pass.id, matchTicketCategory.id, "buyer-1");
    expect(ticket.source).toBe("SEASON_PASS");
    expect(ticket.status).toBe("PAID");
    expect(Number(ticket.price)).toBe(0);

    await expect(service.redeem(pass.id, matchTicketCategory.id, "buyer-1")).rejects.toThrow("déjà été retiré");

    const reloadedMtc = await dataSource.getRepository(MatchTicketCategory).findOneOrFail({ where: { id: matchTicketCategory.id } });
    expect(reloadedMtc.soldCount).toBe(1);
  });

  it("refuses a redemption from someone else's pass", async () => {
    const { SeasonPassService } = await import("./SeasonPassService");
    const { homeTeam, category, matchTicketCategory } = await seedMatchWithCategory(dataSource);
    const service = new SeasonPassService();
    const pass = await service.purchase(homeTeam.id, category.id, "buyer-1");
    await expect(service.redeem(pass.id, matchTicketCategory.id, "someone-else")).rejects.toThrow("introuvable");
  });

  it("refuses redemption once capacity is exhausted", async () => {
    const { SeasonPassService } = await import("./SeasonPassService");
    const { homeTeam, category, matchTicketCategory } = await seedMatchWithCategory(dataSource, { capacity: 0 });
    const service = new SeasonPassService();
    const pass = await service.purchase(homeTeam.id, category.id, "buyer-1");
    await expect(service.redeem(pass.id, matchTicketCategory.id, "buyer-1")).rejects.toThrow("plus de place");
  });

  it("renewal creates a new pass chained via renewedFromId, starting after the current pass expires", async () => {
    const { SeasonPassService } = await import("./SeasonPassService");
    const { homeTeam, category } = await seedMatchWithCategory(dataSource);
    const service = new SeasonPassService();
    const pass = await service.purchase(homeTeam.id, category.id, "buyer-1");

    const renewed = await service.renew(pass.id, "buyer-1");
    expect(renewed.renewedFromId).toBe(pass.id);
    expect(renewed.startsAt.getTime()).toBe(pass.expiresAt.getTime());
    expect(renewed.id).not.toBe(pass.id);
  });

  it("a cancelled pass can no longer be renewed", async () => {
    const { SeasonPassService } = await import("./SeasonPassService");
    const { homeTeam, category } = await seedMatchWithCategory(dataSource);
    const service = new SeasonPassService();
    const pass = await service.purchase(homeTeam.id, category.id, "buyer-1");
    await service.cancel(pass.id, "buyer-1");
    await expect(service.renew(pass.id, "buyer-1")).rejects.toThrow("annulé");
  });
});
