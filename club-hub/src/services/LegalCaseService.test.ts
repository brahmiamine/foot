import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { LegalCase } from "@/entities/LegalCase";
import { assertLegalCaseTransition } from "../../../packages/regulatory-shared/src/legalCase";

let dataSource: DataSource;

vi.mock("@/lib/database", () => ({ getDataSource: async () => dataSource }));

beforeEach(async () => { dataSource = await createTestDataSource(); });
afterEach(async () => { await dataSource.destroy(); });

async function seedCase(overrides: Partial<LegalCase> = {}): Promise<LegalCase> {
  const repo = dataSource.getRepository(LegalCase);
  return repo.save(repo.create({
    id: randomUUID(), caseNumber: `LC-2026-${Math.floor(Math.random() * 99999)}`, federationId: "fed-1", category: "PLAYER_CLUB",
    claimantType: "PLAYER", claimantId: "player-1", respondentType: "CLUB", respondentId: "club-1",
    subject: "Salaire impayé", status: "FILED", filedAt: new Date("2026-01-01"), createdBy: "federation-admin",
    ...overrides,
  }));
}

describe("LegalCaseService (club-hub read + response)", () => {
  it("lists only cases where the club is claimant or respondent", async () => {
    const { listLegalCasesForClub } = await import("./LegalCaseService");
    await seedCase({ respondentId: "club-1" });
    await seedCase({ respondentId: "club-2" });
    const cases = await listLegalCasesForClub("club-1");
    expect(cases).toHaveLength(1);
    expect(cases[0].partyRole).toBe("RESPONDENT");
  });

  it("refuses to load a case the club is not a party to", async () => {
    const { getLegalCaseBundleForClub } = await import("./LegalCaseService");
    const legalCase = await seedCase({ respondentId: "club-2" });
    await expect(getLegalCaseBundleForClub("club-1", legalCase.id)).rejects.toThrow(/introuvable/i);
  });

  it("lets the respondent club add a versioned response document while the case is open", async () => {
    const { addLegalCaseResponse, getLegalCaseBundleForClub } = await import("./LegalCaseService");
    const legalCase = await seedCase({ respondentId: "club-1" });
    await addLegalCaseResponse("club-1", legalCase.id, { fileUrl: "https://example.com/a.pdf", fileName: "reponse.pdf", mimeType: "application/pdf", size: 10, checksum: "a".repeat(64) }, { userId: "u1", role: "CLUB_ADMIN" });
    const bundle = await getLegalCaseBundleForClub("club-1", legalCase.id);
    expect(bundle.documents).toHaveLength(1);
    expect(bundle.documents[0].submittedByType).toBe("RESPONDENT");
    expect(bundle.documents[0].version).toBe(1);
  });

  it("blocks new documents once the case is closed", async () => {
    const { addLegalCaseResponse } = await import("./LegalCaseService");
    const legalCase = await seedCase({ respondentId: "club-1", status: "CLOSED" });
    await expect(addLegalCaseResponse("club-1", legalCase.id, { fileUrl: "x", fileName: "x", mimeType: "application/pdf", size: 1, checksum: "a".repeat(64) }, { userId: "u1", role: "CLUB_ADMIN" })).rejects.toThrow(/n'accepte plus/i);
  });
});

describe("legal case workflow rules", () => {
  it("never lets a decided case leave DECIDED except through APPEALED or CLOSED", () => {
    expect(() => assertLegalCaseTransition("DECIDED", "UNDER_REVIEW")).toThrow();
    expect(() => assertLegalCaseTransition("DECIDED", "APPEALED")).not.toThrow();
    expect(() => assertLegalCaseTransition("DECIDED", "CLOSED")).not.toThrow();
  });
});
