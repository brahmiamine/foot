import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { seedMatchWithCategory } from "@/test/fixtures";
import { TicketPromotion } from "@/entities/TicketPromotion";

let dataSource: DataSource;

vi.mock("@/lib/database", () => ({ getDataSource: async () => dataSource }));

const initPayment = vi.fn();
vi.mock("@/lib/paymentApiClient", () => ({
  getPaymentProvider: () => "konnect",
  initPayment: (...args: unknown[]) => initPayment(...args),
  getPaymentStatus: vi.fn(),
}));

vi.mock("@/lib/ssoProfileClient", () => ({
  fetchMemberAffiliatedTeamIds: vi.fn(),
  fetchMemberProfile: vi.fn(),
}));

beforeEach(async () => {
  dataSource = await createTestDataSource();
  initPayment.mockResolvedValue({ paymentId: "payment-1", payUrl: "https://pay.example/1" });
});

afterEach(async () => {
  await dataSource.destroy();
  vi.resetAllMocks();
});

/**
 * Écrit directement la promotion (plutôt que via TicketPromotionService.create)
 * pour isoler ce test de la résolution de propriété club/match — testée
 * séparément dans TicketPromotionService.test.ts.
 */
async function seedApprovedPromotion(matchTicketCategoryId: string, overrides: Partial<TicketPromotion> = {}) {
  const repo = dataSource.getRepository(TicketPromotion);
  const row = repo.create({
    id: randomUUID(),
    matchTicketCategoryId,
    code: "PROMO20",
    discountType: "PERCENTAGE",
    discountValue: "20.000",
    maxUses: null,
    usedCount: 0,
    status: "APPROVED",
    createdBy: "staff-1",
    approvedBy: "staff-2",
    approvedAt: new Date(),
    ...overrides,
  });
  return repo.save(row);
}

describe("purchaseTickets — TICK-008 promotion à code", () => {
  it("applies the discount to every ticket in the cart and to the payment amount", async () => {
    const { purchaseTickets } = await import("./tickets");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource, { price: "20.000", capacity: 10 });
    await seedApprovedPromotion(matchTicketCategory.id);

    const { tickets } = await purchaseTickets({
      matchTicketCategoryId: matchTicketCategory.id,
      purchaserId: "user-1",
      purchaserEmail: "user@example.com",
      quantity: 2,
      audienceConfirmed: true,
      promoCode: "promo20",
    });

    expect(tickets).toHaveLength(2);
    expect(tickets.every((t) => Number(t.price) === 16)).toBe(true);
    expect(initPayment).toHaveBeenCalledWith(expect.objectContaining({ amount: 32 }));
  });

  it("rejects an unknown promo code", async () => {
    const { purchaseTickets } = await import("./tickets");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource, { price: "20.000" });

    await expect(
      purchaseTickets({
        matchTicketCategoryId: matchTicketCategory.id,
        purchaserId: "user-1",
        purchaserEmail: "user@example.com",
        quantity: 1,
        audienceConfirmed: true,
        promoCode: "DOESNOTEXIST",
      }),
    ).rejects.toThrow("invalide");
  });

  it("rejects a promotion still in DRAFT while approval is required", async () => {
    const { purchaseTickets } = await import("./tickets");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource, { price: "20.000" });
    await seedApprovedPromotion(matchTicketCategory.id, { status: "DRAFT", approvedBy: null, approvedAt: null });

    await expect(
      purchaseTickets({
        matchTicketCategoryId: matchTicketCategory.id,
        purchaserId: "user-1",
        purchaserEmail: "user@example.com",
        quantity: 1,
        audienceConfirmed: true,
        promoCode: "promo20",
      }),
    ).rejects.toThrow("approuvée");
  });

  it("enforces maxUses across purchases", async () => {
    const { purchaseTickets } = await import("./tickets");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource, { price: "20.000", capacity: 10 });
    await seedApprovedPromotion(matchTicketCategory.id, { maxUses: 1 });

    await purchaseTickets({
      matchTicketCategoryId: matchTicketCategory.id,
      purchaserId: "user-1",
      purchaserEmail: "user@example.com",
      quantity: 1,
      audienceConfirmed: true,
      promoCode: "promo20",
    });

    await expect(
      purchaseTickets({
        matchTicketCategoryId: matchTicketCategory.id,
        purchaserId: "user-2",
        purchaserEmail: "user2@example.com",
        quantity: 1,
        audienceConfirmed: true,
        promoCode: "promo20",
      }),
    ).rejects.toThrow("maximal");
  });

  it("a purchase without a promo code is unaffected (legacy behaviour)", async () => {
    const { purchaseTickets } = await import("./tickets");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource, { price: "20.000" });
    await seedApprovedPromotion(matchTicketCategory.id);

    const { tickets } = await purchaseTickets({
      matchTicketCategoryId: matchTicketCategory.id,
      purchaserId: "user-1",
      purchaserEmail: "user@example.com",
      quantity: 1,
      audienceConfirmed: true,
    });
    expect(Number(tickets[0].price)).toBe(20);
  });
});
