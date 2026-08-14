import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { seedMatchWithCategory } from "@/test/fixtures";

let dataSource: DataSource;

vi.mock("@/lib/database", () => ({
  getDataSource: async () => dataSource,
}));

const initPayment = vi.fn();
const getPaymentStatus = vi.fn();
const requestRefund = vi.fn();
vi.mock("@/lib/paymentApiClient", () => ({
  getPaymentProvider: () => "konnect",
  initPayment: (...args: unknown[]) => initPayment(...args),
  getPaymentStatus: (...args: unknown[]) => getPaymentStatus(...args),
  requestRefund: (...args: unknown[]) => requestRefund(...args),
  getRefundStatus: vi.fn(),
}));

vi.mock("@/lib/ssoProfileClient", () => ({
  fetchMemberAffiliatedTeamIds: vi.fn(),
  fetchMemberProfile: vi.fn(),
}));

beforeEach(async () => {
  dataSource = await createTestDataSource();
  initPayment.mockReset();
  getPaymentStatus.mockReset();
  requestRefund.mockReset();
  requestRefund.mockResolvedValue({ id: "refund-1", status: "MANUAL_REVIEW" });
});

afterEach(async () => {
  await dataSource.destroy();
  vi.restoreAllMocks();
});

/** TASK-P0-016 : paiement confirmé tardivement après libération de la capacité. */
describe("reconcileTicketPayment — paiement tardif après libération (SQLite réel)", () => {
  it("détecte un paiement confirmé tardivement après libération de la capacité (PAID_STOCK_UNAVAILABLE)", async () => {
    const { purchaseTickets, reconcileTicketPayment } = await import("./tickets");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource, { capacity: 1 });
    initPayment.mockResolvedValue({ paymentId: "pay_1", payUrl: "https://pay.example.com/pay_1" });

    await purchaseTickets({
      matchTicketCategoryId: matchTicketCategory.id,
      purchaserId: "user-1",
      purchaserEmail: "user@example.com",
      quantity: 1,
      audienceConfirmed: true,
    });

    getPaymentStatus.mockResolvedValue("FAILED");
    await reconcileTicketPayment("pay_1"); // le billet passe CANCELLED, capacité libérée

    // Le fournisseur confirme finalement le paiement, après coup.
    getPaymentStatus.mockResolvedValue("PAID");
    const result = await reconcileTicketPayment("pay_1");

    expect(result).toBe("PAID_STOCK_UNAVAILABLE");
    // TASK-P0-002 : une demande de remboursement est déclenchée
    // automatiquement plutôt que de laisser un simple signal pour ops.
    expect(requestRefund).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: "pay_1", idempotencyKey: "stock-unavailable:pay_1" }),
    );
  });

  it("un billet CANCELLED dont le paiement reste non confirmé reste CANCELLED", async () => {
    const { purchaseTickets, reconcileTicketPayment } = await import("./tickets");
    const { matchTicketCategory } = await seedMatchWithCategory(dataSource, { capacity: 1 });
    initPayment.mockResolvedValue({ paymentId: "pay_1", payUrl: "https://pay.example.com/pay_1" });

    await purchaseTickets({
      matchTicketCategoryId: matchTicketCategory.id,
      purchaserId: "user-1",
      purchaserEmail: "user@example.com",
      quantity: 1,
      audienceConfirmed: true,
    });

    getPaymentStatus.mockResolvedValue("FAILED");
    await reconcileTicketPayment("pay_1");

    getPaymentStatus.mockResolvedValue("EXPIRED");
    expect(await reconcileTicketPayment("pay_1")).toBe("CANCELLED");
  });
});
