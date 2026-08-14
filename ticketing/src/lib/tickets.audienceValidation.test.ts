import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { seedMatchWithCategory } from "@/test/fixtures";
import { TicketSaleRule } from "@/entities/TicketSaleRule";
import { Ticket } from "@/entities/Ticket";

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

const fetchMemberAffiliatedTeamIds = vi.fn();
vi.mock("@/lib/ssoProfileClient", () => ({
  fetchMemberAffiliatedTeamIds: (...args: unknown[]) => fetchMemberAffiliatedTeamIds(...args),
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

/** US-38 : audienceValidationMode (STRICT/DECLARATIVE) sur TicketSaleRule. */
describe("purchaseTickets — audienceValidationMode (SQLite réel)", () => {
  it("mode DECLARATIVE (défaut) : audienceConfirmed suffit, aucun appel sso bloquant", async () => {
    const { purchaseTickets } = await import("./tickets");
    const { homeTeam, matchTicketCategory } = await seedMatchWithCategory(dataSource);
    await dataSource.getRepository(TicketSaleRule).save(
      dataSource.getRepository(TicketSaleRule).create({
        matchTicketCategoryId: matchTicketCategory.id,
        allowedAudience: "HOME_SUPPORTERS",
        audienceValidationMode: "DECLARATIVE",
      }),
    );
    fetchMemberAffiliatedTeamIds.mockResolvedValue(new Set([]));

    const result = await purchaseTickets({
      matchTicketCategoryId: matchTicketCategory.id,
      purchaserId: "user-1",
      purchaserEmail: "user@example.com",
      quantity: 1,
      audienceConfirmed: true,
    });

    expect(result.tickets).toHaveLength(1);
    expect(result.tickets[0].declaredAudience).toBe("HOME_SUPPORTERS");
    void homeTeam;
  });

  it("mode DECLARATIVE : refuse sans audienceConfirmed", async () => {
    const { purchaseTickets } = await import("./tickets");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource);
    await dataSource.getRepository(TicketSaleRule).save(
      dataSource.getRepository(TicketSaleRule).create({
        matchTicketCategoryId: matchTicketCategory.id,
        allowedAudience: "HOME_SUPPORTERS",
        audienceValidationMode: "DECLARATIVE",
      }),
    );

    await expect(
      purchaseTickets({
        matchTicketCategoryId: matchTicketCategory.id,
        purchaserId: "user-1",
        purchaserEmail: "user@example.com",
        quantity: 1,
        audienceConfirmed: false,
      }),
    ).rejects.toThrow(/réservée aux supporters/);
    expect(initPayment).not.toHaveBeenCalled();
  });

  it("mode STRICT : autorise l'achat quand l'acheteur est affilié à l'équipe recevante", async () => {
    const { purchaseTickets } = await import("./tickets");
    const { homeTeam, matchTicketCategory } = await seedMatchWithCategory(dataSource);
    await dataSource.getRepository(TicketSaleRule).save(
      dataSource.getRepository(TicketSaleRule).create({
        matchTicketCategoryId: matchTicketCategory.id,
        allowedAudience: "HOME_SUPPORTERS",
        audienceValidationMode: "STRICT",
      }),
    );
    fetchMemberAffiliatedTeamIds.mockResolvedValue(new Set([homeTeam.id]));

    const result = await purchaseTickets({
      matchTicketCategoryId: matchTicketCategory.id,
      purchaserId: "user-1",
      purchaserEmail: "user@example.com",
      quantity: 1,
      audienceConfirmed: false,
    });

    expect(result.tickets).toHaveLength(1);
    expect(initPayment).toHaveBeenCalledTimes(1);
  });

  it("mode STRICT : refuse l'achat quand l'acheteur n'est pas affilié, même avec audienceConfirmed", async () => {
    const { purchaseTickets } = await import("./tickets");
    const { awayTeam, matchTicketCategory } = await seedMatchWithCategory(dataSource);
    await dataSource.getRepository(TicketSaleRule).save(
      dataSource.getRepository(TicketSaleRule).create({
        matchTicketCategoryId: matchTicketCategory.id,
        allowedAudience: "HOME_SUPPORTERS",
        audienceValidationMode: "STRICT",
      }),
    );
    fetchMemberAffiliatedTeamIds.mockResolvedValue(new Set([awayTeam.id]));

    await expect(
      purchaseTickets({
        matchTicketCategoryId: matchTicketCategory.id,
        purchaserId: "user-1",
        purchaserEmail: "user@example.com",
        quantity: 1,
        audienceConfirmed: true,
      }),
    ).rejects.toThrow(/réservée aux supporters affiliés/);
    expect(initPayment).not.toHaveBeenCalled();

    const tickets = await dataSource.getRepository(Ticket).find();
    expect(tickets).toHaveLength(0);
  });

  it("mode STRICT : refuse l'achat quand l'appel sso échoue (fail-closed)", async () => {
    const { purchaseTickets } = await import("./tickets");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource);
    await dataSource.getRepository(TicketSaleRule).save(
      dataSource.getRepository(TicketSaleRule).create({
        matchTicketCategoryId: matchTicketCategory.id,
        allowedAudience: "HOME_SUPPORTERS",
        audienceValidationMode: "STRICT",
      }),
    );
    fetchMemberAffiliatedTeamIds.mockResolvedValue(null);

    await expect(
      purchaseTickets({
        matchTicketCategoryId: matchTicketCategory.id,
        purchaserId: "user-1",
        purchaserEmail: "user@example.com",
        quantity: 1,
        audienceConfirmed: true,
      }),
    ).rejects.toThrow(/réservée aux supporters affiliés/);
  });

  it("catégorie PUBLIC : aucun appel sso, aucune restriction", async () => {
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
    expect(fetchMemberAffiliatedTeamIds).not.toHaveBeenCalled();
  });
});
