import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { seedMatchWithCategory } from "@/test/fixtures";
import { MatchTicketCategory } from "@/entities/MatchTicketCategory";

let dataSource: DataSource;

vi.mock("@/lib/database", () => ({
  getDataSource: async () => dataSource,
}));

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
 * TASK-P0-004 : le UPDATE conditionnel atomique (sold_count + qty <=
 * capacity) doit empêcher tout surbooking, même si le check applicatif
 * précédent (remaining) était contourné ou la lecture périmée.
 */
describe("purchaseTickets — garde-fou capacité atomique (SQLite réel)", () => {
  it("refuse un achat qui dépasserait la capacité restante, sans modifier soldCount", async () => {
    const { purchaseTickets } = await import("./tickets");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource, { capacity: 1, soldCount: 1 });

    await expect(
      purchaseTickets({
        matchTicketCategoryId: matchTicketCategory.id,
        purchaserId: "user-1",
        purchaserEmail: "user@example.com",
        quantity: 1,
        audienceConfirmed: true,
      }),
    ).rejects.toThrow();

    const reloaded = await dataSource
      .getRepository(MatchTicketCategory)
      .findOneOrFail({ where: { id: matchTicketCategory.id } });
    expect(reloaded.soldCount).toBe(1);
  });

  it("vend la dernière place disponible puis refuse la suivante (soldCount jamais > capacity)", async () => {
    const { purchaseTickets } = await import("./tickets");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource, { capacity: 1, soldCount: 0 });

    const result = await purchaseTickets({
      matchTicketCategoryId: matchTicketCategory.id,
      purchaserId: "user-1",
      purchaserEmail: "user1@example.com",
      quantity: 1,
      audienceConfirmed: true,
    });
    expect(result.tickets).toHaveLength(1);

    await expect(
      purchaseTickets({
        matchTicketCategoryId: matchTicketCategory.id,
        purchaserId: "user-2",
        purchaserEmail: "user2@example.com",
        quantity: 1,
        audienceConfirmed: true,
      }),
    ).rejects.toThrow();

    const reloaded = await dataSource
      .getRepository(MatchTicketCategory)
      .findOneOrFail({ where: { id: matchTicketCategory.id } });
    expect(reloaded.soldCount).toBe(1);
    expect(reloaded.soldCount).toBeLessThanOrEqual(reloaded.capacity);
  });
});
