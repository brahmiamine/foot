import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { seedMatchWithCategory } from "@/test/fixtures";
import { TicketSaleRule } from "@/entities/TicketSaleRule";

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

const fetchActiveMembership = vi.fn();
vi.mock("@/lib/clubHubMembershipClient", () => ({
  fetchActiveMembership: (...args: unknown[]) => fetchActiveMembership(...args),
}));

beforeEach(async () => {
  dataSource = await createTestDataSource();
  initPayment.mockResolvedValue({ paymentId: "payment-1", payUrl: "https://pay.example/1" });
});

afterEach(async () => {
  await dataSource.destroy();
  vi.resetAllMocks();
});

/** OB-003 : prévente réservée aux membres, règle serveur fail-closed. */
describe("purchaseTickets — presale membership (SQLite réel)", () => {
  it("allows the purchase when presaleRequiresMembership is not set", async () => {
    const { purchaseTickets } = await import("./tickets");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource);

    const result = await purchaseTickets({
      matchTicketCategoryId: matchTicketCategory.id,
      purchaserId: "user-1",
      purchaserEmail: "user@example.com",
      quantity: 1,
      audienceConfirmed: false,
    });

    expect(result.tickets).toHaveLength(1);
    expect(fetchActiveMembership).not.toHaveBeenCalled();
  });

  it("allows the purchase when the buyer has a qualifying active membership", async () => {
    const { purchaseTickets } = await import("./tickets");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource);
    await dataSource.getRepository(TicketSaleRule).save(
      dataSource.getRepository(TicketSaleRule).create({
        matchTicketCategoryId: matchTicketCategory.id,
        presaleRequiresMembership: true,
        presaleMembershipCodes: ["SOCIO", "VIP"],
      }),
    );
    fetchActiveMembership.mockResolvedValue({ membershipTypeId: "t1", code: "VIP", rights: [], expiresAt: null });

    const result = await purchaseTickets({
      matchTicketCategoryId: matchTicketCategory.id,
      purchaserId: "user-1",
      purchaserEmail: "user@example.com",
      quantity: 1,
      audienceConfirmed: false,
    });

    expect(result.tickets).toHaveLength(1);
  });

  it("refuses the purchase when the buyer has no active membership (fail-closed on club-hub failure)", async () => {
    const { purchaseTickets } = await import("./tickets");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource);
    await dataSource.getRepository(TicketSaleRule).save(
      dataSource.getRepository(TicketSaleRule).create({
        matchTicketCategoryId: matchTicketCategory.id,
        presaleRequiresMembership: true,
      }),
    );
    // Simule un échec d'appel club-hub : le client renvoie null (voir clubHubMembershipClient.ts).
    fetchActiveMembership.mockResolvedValue(null);

    await expect(
      purchaseTickets({
        matchTicketCategoryId: matchTicketCategory.id,
        purchaserId: "user-1",
        purchaserEmail: "user@example.com",
        quantity: 1,
        audienceConfirmed: false,
      }),
    ).rejects.toThrow("réservée en prévente aux membres");
  });

  it("refuses the purchase when the active membership's code is not in the allowed list", async () => {
    const { purchaseTickets } = await import("./tickets");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource);
    await dataSource.getRepository(TicketSaleRule).save(
      dataSource.getRepository(TicketSaleRule).create({
        matchTicketCategoryId: matchTicketCategory.id,
        presaleRequiresMembership: true,
        presaleMembershipCodes: ["VIP"],
      }),
    );
    fetchActiveMembership.mockResolvedValue({ membershipTypeId: "t1", code: "FAN", rights: [], expiresAt: null });

    await expect(
      purchaseTickets({
        matchTicketCategoryId: matchTicketCategory.id,
        purchaserId: "user-1",
        purchaserEmail: "user@example.com",
        quantity: 1,
        audienceConfirmed: false,
      }),
    ).rejects.toThrow("réservée en prévente aux membres");
  });

  it("lifts the membership restriction once presaleEndsAt has passed", async () => {
    const { purchaseTickets } = await import("./tickets");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource);
    await dataSource.getRepository(TicketSaleRule).save(
      dataSource.getRepository(TicketSaleRule).create({
        matchTicketCategoryId: matchTicketCategory.id,
        presaleRequiresMembership: true,
        presaleEndsAt: new Date(Date.now() - 60_000),
      }),
    );

    const result = await purchaseTickets({
      matchTicketCategoryId: matchTicketCategory.id,
      purchaserId: "user-1",
      purchaserEmail: "user@example.com",
      quantity: 1,
      audienceConfirmed: false,
    });

    expect(result.tickets).toHaveLength(1);
    expect(fetchActiveMembership).not.toHaveBeenCalled();
  });
});
