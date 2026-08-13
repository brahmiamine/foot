import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { Match } from "@/entities/Match";
import { MatchCancellationRefund } from "@/entities/MatchCancellationRefund";
import { MatchTicketCategory } from "@/entities/MatchTicketCategory";
import { Team } from "@/entities/Team";
import { Ticket } from "@/entities/Ticket";

let dataSource: DataSource;

vi.mock("@/lib/database", () => ({
  getDataSource: async () => dataSource,
}));

const requestRefund = vi.fn();
const getRefundStatus = vi.fn();
vi.mock("@/lib/paymentApiClient", () => ({
  requestRefund: (...args: unknown[]) => requestRefund(...args),
  getRefundStatus: (...args: unknown[]) => getRefundStatus(...args),
}));

beforeEach(async () => {
  dataSource = await createTestDataSource();
  requestRefund.mockReset();
  getRefundStatus.mockReset();
});

afterEach(async () => {
  await dataSource.destroy();
  vi.restoreAllMocks();
});

async function seedCancelledMatchWithTickets() {
  const teamRepo = dataSource.getRepository(Team);
  const matchRepo = dataSource.getRepository(Match);
  const mtcRepo = dataSource.getRepository(MatchTicketCategory);
  const ticketRepo = dataSource.getRepository(Ticket);

  const home = await teamRepo.save(teamRepo.create({ id: "team-home", nom: "Domicile FC" }));
  const away = await teamRepo.save(teamRepo.create({ id: "team-away", nom: "Visiteur FC" }));
  const match = await matchRepo.save(
    matchRepo.create({ id: "match-1", equipeHome: home.id, equipeAway: away.id, status: "CANCELLED", isPublicVisible: true }),
  );
  const mtc = await mtcRepo.save(
    mtcRepo.create({ id: "mtc-1", matchId: match.id, categoryId: "cat-1", price: "20.000", capacity: 100, soldCount: 3 }),
  );

  // Deux billets PAID partageant le même paiement (achat de quantité 2).
  await ticketRepo.save([
    ticketRepo.create({ id: "tkt-paid-1", matchId: match.id, matchTicketCategoryId: mtc.id, organizerTeamId: home.id, purchaserId: "user-1", status: "PAID", reference: "REF1", price: "20.000", paymentId: "pay_1" }),
    ticketRepo.create({ id: "tkt-paid-2", matchId: match.id, matchTicketCategoryId: mtc.id, organizerTeamId: home.id, purchaserId: "user-1", status: "PAID", reference: "REF2", price: "20.000", paymentId: "pay_1" }),
    // Réservation en cours au moment de l'annulation.
    ticketRepo.create({ id: "tkt-pending-1", matchId: match.id, matchTicketCategoryId: mtc.id, organizerTeamId: home.id, purchaserId: "user-2", status: "PENDING", reference: "REF3", price: "20.000", paymentId: null }),
  ]);

  return { match, mtc, home, away };
}

describe("cancelMatchTickets", () => {
  it("annule les billets PENDING et libère la capacité de la catégorie", async () => {
    const { cancelMatchTickets } = await import("./matchCancellationRefunds");
    const { mtc } = await seedCancelledMatchWithTickets();
    requestRefund.mockResolvedValue({ id: "refund-1", status: "MANUAL_REVIEW" });

    const result = await cancelMatchTickets("match-1");

    expect(result.ticketsReleased).toBe(1);
    const ticket = await dataSource.getRepository(Ticket).findOne({ where: { id: "tkt-pending-1" } });
    expect(ticket?.status).toBe("CANCELLED");
    const reloadedMtc = await dataSource.getRepository(MatchTicketCategory).findOne({ where: { id: mtc.id } });
    expect(reloadedMtc?.soldCount).toBe(2); // 3 - 1 billet PENDING libéré
  });

  it("ouvre un seul dossier de remboursement pour les deux billets PAID du même paiement", async () => {
    const { cancelMatchTickets } = await import("./matchCancellationRefunds");
    await seedCancelledMatchWithTickets();
    requestRefund.mockResolvedValue({ id: "refund-1", status: "SUCCEEDED" });

    const result = await cancelMatchTickets("match-1");

    expect(result.refundCasesOpened).toBe(1);
    expect(requestRefund).toHaveBeenCalledTimes(1);
    expect(requestRefund).toHaveBeenCalledWith(expect.objectContaining({ paymentId: "pay_1", idempotencyKey: "match-cancelled:pay_1" }));
    const dossiers = await dataSource.getRepository(MatchCancellationRefund).find();
    expect(dossiers).toHaveLength(1);
    expect(dossiers[0].refundStatus).toBe("SUCCEEDED");
  });

  it("est idempotent : rejouer ne relibère pas de billets ni ne redemande un second remboursement", async () => {
    const { cancelMatchTickets } = await import("./matchCancellationRefunds");
    await seedCancelledMatchWithTickets();
    requestRefund.mockResolvedValue({ id: "refund-1", status: "SUCCEEDED" });

    await cancelMatchTickets("match-1");
    const second = await cancelMatchTickets("match-1");

    expect(second.ticketsReleased).toBe(0);
    expect(second.refundCasesOpened).toBe(1); // le paiement existe toujours, mais aucune nouvelle demande
    expect(requestRefund).toHaveBeenCalledTimes(1);
  });

  it("ne lève jamais quand payment-api est indisponible — le dossier reste PENDING_REFUND_REQUEST", async () => {
    const { cancelMatchTickets } = await import("./matchCancellationRefunds");
    await seedCancelledMatchWithTickets();
    requestRefund.mockRejectedValue(new Error("payment-api unreachable"));

    await expect(cancelMatchTickets("match-1")).resolves.toEqual({ ticketsReleased: 1, refundCasesOpened: 1 });
    const dossier = await dataSource.getRepository(MatchCancellationRefund).findOne({ where: { paymentId: "pay_1" } });
    expect(dossier?.refundStatus).toBe("PENDING_REFUND_REQUEST");
  });
});

describe("processMatchCancellationRefunds", () => {
  it("rattrape un match CANCELLED jamais traité (superadmin/billetterie n'ont jamais communiqué)", async () => {
    const { processMatchCancellationRefunds } = await import("./matchCancellationRefunds");
    await seedCancelledMatchWithTickets();
    requestRefund.mockResolvedValue({ id: "refund-1", status: "MANUAL_REVIEW" });

    const report = await processMatchCancellationRefunds();

    expect(report.matchesScanned).toBe(1);
    expect(report.ticketsReleased).toBe(1);
    expect(report.refundCasesOpened).toBe(1);
  });

  it("ne rescanne pas un match déjà entièrement traité", async () => {
    const { cancelMatchTickets, processMatchCancellationRefunds } = await import("./matchCancellationRefunds");
    await seedCancelledMatchWithTickets();
    requestRefund.mockResolvedValue({ id: "refund-1", status: "SUCCEEDED" });
    await cancelMatchTickets("match-1");

    const report = await processMatchCancellationRefunds();

    expect(report.matchesScanned).toBe(0);
  });

  it("retente un dossier PENDING_REFUND_REQUEST (rejeu après indisponibilité)", async () => {
    const { cancelMatchTickets, processMatchCancellationRefunds } = await import("./matchCancellationRefunds");
    await seedCancelledMatchWithTickets();
    requestRefund.mockRejectedValueOnce(new Error("payment-api unreachable"));
    await cancelMatchTickets("match-1");

    requestRefund.mockResolvedValueOnce({ id: "refund-1", status: "SUCCEEDED" });
    const report = await processMatchCancellationRefunds();

    expect(report.retriedRequests).toBe(1);
    expect(report.resolved).toBe(1);
  });

  it("rafraîchit un dossier MANUAL_REVIEW résolu tardivement par un opérateur", async () => {
    const { cancelMatchTickets, processMatchCancellationRefunds } = await import("./matchCancellationRefunds");
    await seedCancelledMatchWithTickets();
    requestRefund.mockResolvedValue({ id: "refund-1", status: "MANUAL_REVIEW" });
    await cancelMatchTickets("match-1");

    getRefundStatus.mockResolvedValue("SUCCEEDED");
    const report = await processMatchCancellationRefunds();

    expect(report.refreshed).toBe(1);
    expect(report.resolved).toBe(1);
  });
});
