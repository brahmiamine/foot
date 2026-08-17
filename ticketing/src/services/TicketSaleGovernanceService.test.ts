import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { Match } from "@/entities/Match";
import { MatchTicketCategory } from "@/entities/MatchTicketCategory";
import { Team } from "@/entities/Team";
import { TicketCategory } from "@/entities/TicketCategory";
import { TicketSaleRule } from "@/entities/TicketSaleRule";

let dataSource: DataSource;

vi.mock("@/lib/database", () => ({
  getDataSource: async () => dataSource,
}));

const clubId = "40000000-0000-0000-0000-000000000001";
const awayId = "40000000-0000-0000-0000-000000000002";
const otherClubId = "40000000-0000-0000-0000-000000000003";
const matchId = "40000000-0000-0000-0000-000000000004";
const categoryId = "40000000-0000-0000-0000-000000000005";
const offerId = "40000000-0000-0000-0000-000000000006";

async function seedOffer(price = "20.000") {
  const teamRepo = dataSource.getRepository(Team);
  await teamRepo.save([
    teamRepo.create({ id: clubId, nom: "Home Club" }),
    teamRepo.create({ id: awayId, nom: "Away Club" }),
    teamRepo.create({ id: otherClubId, nom: "Other Club" }),
  ]);
  await dataSource.getRepository(Match).save(
    dataSource.getRepository(Match).create({
      id: matchId,
      equipeHome: clubId,
      equipeAway: awayId,
      date: new Date(Date.now() + 24 * 60 * 60_000),
      status: "UPCOMING",
      illegalPlayerUsed: false,
      isPublicVisible: true,
    }),
  );
  await dataSource.getRepository(TicketCategory).save(
    dataSource.getRepository(TicketCategory).create({ id: categoryId, name: "Gradin", isActive: true }),
  );
  return dataSource.getRepository(MatchTicketCategory).save(
    dataSource.getRepository(MatchTicketCategory).create({
      id: offerId,
      matchId,
      ticketCategoryId: categoryId,
      price,
      capacity: 100,
      sold: 0,
      isActive: true,
    }),
  );
}

beforeEach(async () => {
  dataSource = await createTestDataSource();
});

afterEach(async () => {
  await dataSource.destroy();
  vi.restoreAllMocks();
});

describe("TicketSaleGovernanceService", () => {
  it("requires review, forbids self-approval and schedules a future sale", async () => {
    await seedOffer();
    const { TicketSaleGovernanceService } = await import("./TicketSaleGovernanceService");
    const service = new TicketSaleGovernanceService();
    const startsAt = new Date(Date.now() + 60_000);

    await service.updateConfiguration(offerId, clubId, { startsAt, maxTicketsPerUser: 3 });
    const submitted = await service.submit(offerId, clubId, "maker-1");
    expect(submitted.status).toBe("READY_FOR_REVIEW");
    await expect(service.approve(offerId, clubId, "maker-1")).rejects.toThrow("ne peut pas approuver");

    const approved = await service.approve(offerId, clubId, "checker-1", new Date());
    expect(approved.status).toBe("SCHEDULED");
    expect(approved.approvedFingerprint).toHaveLength(64);

    await expect(service.assertPurchasable(offerId, new Date())).rejects.toThrow("statut SCHEDULED");
    const processed = await service.processDue(new Date(startsAt.getTime() + 1));
    expect(processed.opened).toBe(1);
    await expect(service.assertPurchasable(offerId, new Date(startsAt.getTime() + 1))).resolves.toMatchObject({ status: "OPEN" });
  });

  it("moves an OPEN sale back to review when the approved price changes", async () => {
    await seedOffer();
    const { TicketSaleGovernanceService } = await import("./TicketSaleGovernanceService");
    const service = new TicketSaleGovernanceService();
    await service.updateSettings(clubId, "admin-1", {
      saleApprovalRequired: false,
      makerCheckerEnabled: true,
      priceReapprovalRequired: true,
    });
    const opened = await service.submit(offerId, clubId, "admin-1");
    expect(opened.status).toBe("OPEN");

    await service.updatePrice(offerId, clubId, "25");
    const rule = await dataSource.getRepository(TicketSaleRule).findOneByOrFail({ matchTicketCategoryId: offerId });
    expect(rule).toMatchObject({ status: "READY_FOR_REVIEW", approvedFingerprint: null });
    await expect(service.assertPurchasable(offerId)).rejects.toThrow("READY_FOR_REVIEW");
  });

  it("fails closed when no rule exists and prevents cross-club administration", async () => {
    await seedOffer();
    const { TicketSaleGovernanceService } = await import("./TicketSaleGovernanceService");
    const service = new TicketSaleGovernanceService();

    await expect(service.assertPurchasable(offerId)).rejects.toThrow("n'est pas ouverte");
    await expect(service.getOrCreateRule(offerId, otherClubId)).rejects.toThrow("n'appartient pas à votre club");
  });

  it("pauses and resumes only with the approved fingerprint unchanged", async () => {
    await seedOffer();
    const { TicketSaleGovernanceService } = await import("./TicketSaleGovernanceService");
    const service = new TicketSaleGovernanceService();
    await service.updateSettings(clubId, "admin-1", { saleApprovalRequired: false });
    await service.submit(offerId, clubId, "admin-1");
    expect((await service.pause(offerId, clubId)).status).toBe("PAUSED");
    expect((await service.resume(offerId, clubId)).status).toBe("OPEN");
  });
});
