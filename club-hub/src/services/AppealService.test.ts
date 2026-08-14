import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { LegalCase } from "@/entities/LegalCase";
import { TeamAffiliation } from "@/entities/TeamAffiliation";

let dataSource: DataSource;

vi.mock("@/lib/database", () => ({ getDataSource: async () => dataSource }));

beforeEach(async () => { dataSource = await createTestDataSource(); });
afterEach(async () => { await dataSource.destroy(); });

async function seedAffiliation(clubId: string): Promise<void> {
  const repo = dataSource.getRepository(TeamAffiliation);
  await repo.save(repo.create({ teamId: clubId, federationId: "fed-1", leagueId: null, status: "ACTIVE" }));
}

describe("AppealService", () => {
  it("submits an appeal on behalf of the club, scoped to its affiliation", async () => {
    const { submitAppealForClub, listAppealsForClub } = await import("./AppealService");
    await seedAffiliation("club-1");
    const appeal = await submitAppealForClub("club-1", { sourceType: "CLUB_SANCTION", sourceId: randomUUID(), grounds: "Sanction disproportionnée" }, { userId: "u1", role: "CLUB_ADMIN" });
    expect(appeal.status).toBe("SUBMITTED");
    expect(appeal.applicantType).toBe("CLUB");
    expect(appeal.applicantId).toBe("club-1");
    const items = await listAppealsForClub("club-1");
    expect(items).toHaveLength(1);
  });

  it("refuses to submit without an active affiliation", async () => {
    const { submitAppealForClub } = await import("./AppealService");
    await expect(submitAppealForClub("club-without-affiliation", { sourceType: "OTHER", sourceId: randomUUID(), grounds: "x" }, { userId: "u1", role: "CLUB_ADMIN" })).rejects.toThrow(/affiliation/i);
  });

  it("marks a DECIDED legal case as APPEALED when appealed, without touching its decision history", async () => {
    const { submitAppealForClub } = await import("./AppealService");
    await seedAffiliation("club-2");
    const legalCaseRepo = dataSource.getRepository(LegalCase);
    const legalCase = await legalCaseRepo.save(legalCaseRepo.create({ caseNumber: "LC-2026-00001", federationId: "fed-1", category: "CLUB_CLUB", claimantType: "CLUB", claimantId: "club-9", respondentType: "CLUB", respondentId: "club-2", subject: "Litige", status: "DECIDED", filedAt: new Date("2026-01-01"), decisionSummary: "Décision initiale", createdBy: "federation-admin" }));
    await submitAppealForClub("club-2", { sourceType: "LEGAL_CASE", sourceId: legalCase.id, grounds: "Contestation" }, { userId: "u1", role: "CLUB_ADMIN" });
    const reloaded = await legalCaseRepo.findOneByOrFail({ id: legalCase.id });
    expect(reloaded.status).toBe("APPEALED");
    expect(reloaded.decisionSummary).toBe("Décision initiale");
  });

  it("does not touch a legal case that is not yet DECIDED", async () => {
    const { submitAppealForClub } = await import("./AppealService");
    await seedAffiliation("club-3");
    const legalCaseRepo = dataSource.getRepository(LegalCase);
    const legalCase = await legalCaseRepo.save(legalCaseRepo.create({ caseNumber: "LC-2026-00002", federationId: "fed-1", category: "CLUB_CLUB", claimantType: "CLUB", claimantId: "club-9", respondentType: "CLUB", respondentId: "club-3", subject: "Litige", status: "UNDER_REVIEW", filedAt: new Date("2026-01-01"), createdBy: "federation-admin" }));
    await submitAppealForClub("club-3", { sourceType: "LEGAL_CASE", sourceId: legalCase.id, grounds: "Prématuré" }, { userId: "u1", role: "CLUB_ADMIN" });
    const reloaded = await legalCaseRepo.findOneByOrFail({ id: legalCase.id });
    expect(reloaded.status).toBe("UNDER_REVIEW");
  });
});
