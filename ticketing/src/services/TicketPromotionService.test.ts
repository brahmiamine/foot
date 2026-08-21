import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { seedMatchWithCategory } from "@/test/fixtures";

let dataSource: DataSource;

vi.mock("@/lib/database", () => ({ getDataSource: async () => dataSource }));

beforeEach(async () => {
  dataSource = await createTestDataSource();
});
afterEach(async () => dataSource.destroy());

describe("TicketPromotionService — TICK-008", () => {
  it("creates a DRAFT promotion, rejects duplicate codes on the same offer", async () => {
    const { TicketPromotionService } = await import("./TicketPromotionService");
    const { homeTeam, matchTicketCategory } = await seedMatchWithCategory(dataSource);
    const service = new TicketPromotionService();

    const promo = await service.create(homeTeam.id, "staff-1", {
      matchTicketCategoryId: matchTicketCategory.id,
      code: "welcome10",
      discountType: "PERCENTAGE",
      discountValue: "10",
    });
    expect(promo.status).toBe("DRAFT");
    expect(promo.code).toBe("WELCOME10");

    await expect(
      service.create(homeTeam.id, "staff-1", {
        matchTicketCategoryId: matchTicketCategory.id,
        code: "WELCOME10",
        discountType: "FIXED_AMOUNT",
        discountValue: "5",
      }),
    ).rejects.toThrow("existe déjà");
  });

  it("rejects a percentage discount above 100", async () => {
    const { TicketPromotionService } = await import("./TicketPromotionService");
    const { homeTeam, matchTicketCategory } = await seedMatchWithCategory(dataSource);
    const service = new TicketPromotionService();
    await expect(
      service.create(homeTeam.id, "staff-1", {
        matchTicketCategoryId: matchTicketCategory.id,
        code: "TOOMUCH",
        discountType: "PERCENTAGE",
        discountValue: "150",
      }),
    ).rejects.toThrow("100");
  });

  it("requires a different approver than the creator", async () => {
    const { TicketPromotionService } = await import("./TicketPromotionService");
    const { homeTeam, matchTicketCategory } = await seedMatchWithCategory(dataSource);
    const service = new TicketPromotionService();
    const promo = await service.create(homeTeam.id, "staff-1", {
      matchTicketCategoryId: matchTicketCategory.id,
      code: "WELCOME10",
      discountType: "PERCENTAGE",
      discountValue: "10",
    });
    await expect(service.approve(promo.id, homeTeam.id, "staff-1")).rejects.toThrow("propre promotion");
    const approved = await service.approve(promo.id, homeTeam.id, "staff-2");
    expect(approved.status).toBe("APPROVED");
    expect(approved.approvedBy).toBe("staff-2");
  });
});
