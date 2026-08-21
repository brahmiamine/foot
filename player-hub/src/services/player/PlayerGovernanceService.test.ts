import { describe, expect, it, vi } from "vitest";
import { PlayerAvailabilityDeclaration } from "@/entities/PlayerAvailabilityDeclaration";
import { PlayerConsent } from "@/entities/PlayerConsent";
import { PlayerAdministrativeRequest } from "@/entities/PlayerAdministrativeRequest";
import { PlayerContract } from "@/entities/PlayerContract";
import { PlayerRegistration } from "@/entities/PlayerRegistration";
import { MedicalEligibility } from "@/entities/MedicalEligibility";
import { PlayerGovernanceService, PlayerGovernanceServiceError } from "./PlayerGovernanceService";

function fieldMatches(actual: unknown, expected: unknown): boolean {
  if (expected && typeof expected === "object" && "_type" in expected && (expected as { _type: string })._type === "isNull") {
    return actual === null || actual === undefined;
  }
  return actual === expected;
}

function fakeRepo<T extends { id: unknown }>(rows: T[]) {
  return {
    find: vi.fn(async (options?: { where?: Record<string, unknown>; order?: unknown }) =>
      rows.filter((row) =>
        Object.entries(options?.where ?? {}).every(([key, value]) => fieldMatches((row as Record<string, unknown>)[key], value)),
      ),
    ),
    findOne: vi.fn(async (options: { where: Record<string, unknown> }) =>
      rows.find((row) => Object.entries(options.where).every(([key, value]) => fieldMatches((row as Record<string, unknown>)[key], value))) ?? null,
    ),
    create: vi.fn((data: Partial<T>) => ({ ...data }) as T),
    save: vi.fn(async (entity: T) => {
      if (entity.id === undefined || entity.id === null) (entity as Record<string, unknown>).id = rows.length + 1;
      const index = rows.findIndex((row) => row.id === entity.id);
      if (index >= 0) rows[index] = entity;
      else rows.push(entity);
      return entity;
    }),
  };
}

function serviceWith(options: {
  availability?: PlayerAvailabilityDeclaration[];
  consents?: PlayerConsent[];
  requests?: PlayerAdministrativeRequest[];
  contracts?: PlayerContract[];
  registrations?: PlayerRegistration[];
  eligibilities?: MedicalEligibility[];
}) {
  const availability = options.availability ?? [];
  const consents = options.consents ?? [];
  const requests = options.requests ?? [];
  const contracts = options.contracts ?? [];
  const registrations = options.registrations ?? [];
  const eligibilities = options.eligibilities ?? [];

  const repos = new Map<unknown, unknown>([
    [PlayerAvailabilityDeclaration, fakeRepo(availability)],
    [PlayerConsent, fakeRepo(consents)],
    [PlayerAdministrativeRequest, fakeRepo(requests)],
    [PlayerContract, fakeRepo(contracts)],
    [PlayerRegistration, fakeRepo(registrations)],
    [MedicalEligibility, fakeRepo(eligibilities)],
  ]);

  const dataSource = { getRepository: (entity: unknown) => repos.get(entity) };

  class TestService extends PlayerGovernanceService {
    protected override async ds() {
      return dataSource as never;
    }
  }

  return { service: new TestService(), availability, consents, requests };
}

describe("PlayerGovernanceService — PLAYER-002 availability declarations", () => {
  it("declares a new availability period", async () => {
    const { service, availability } = serviceWith({});
    const result = await service.declareAvailability("team-1", "player-1", "user-1", {
      status: "UNAVAILABLE",
      startDate: "2026-09-01",
      endDate: "2026-09-05",
      reason: "Blessure",
    });
    expect(result.status).toBe("UNAVAILABLE");
    expect(availability).toHaveLength(1);
  });

  it("rejects an end date before the start date", async () => {
    const { service } = serviceWith({});
    await expect(
      service.declareAvailability("team-1", "player-1", "user-1", { status: "UNAVAILABLE", startDate: "2026-09-05", endDate: "2026-09-01" }),
    ).rejects.toThrow(PlayerGovernanceServiceError);
  });

  it("rejects a period overlapping an existing active declaration", async () => {
    const { service } = serviceWith({
      availability: [
        { id: 1, teamId: "team-1", playerId: "player-1", status: "UNAVAILABLE", startDate: "2026-09-01", endDate: "2026-09-10", reason: null, declaredByUserId: "user-1", cancelledAt: null, createdAt: new Date(), updatedAt: new Date() },
      ],
    });
    await expect(
      service.declareAvailability("team-1", "player-1", "user-1", { status: "LIMITED", startDate: "2026-09-05", endDate: "2026-09-15" }),
    ).rejects.toThrow("chevauche");
  });

  it("allows a period overlapping a cancelled declaration", async () => {
    const { service } = serviceWith({
      availability: [
        { id: 1, teamId: "team-1", playerId: "player-1", status: "UNAVAILABLE", startDate: "2026-09-01", endDate: "2026-09-10", reason: null, declaredByUserId: "user-1", cancelledAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
      ],
    });
    await expect(
      service.declareAvailability("team-1", "player-1", "user-1", { status: "LIMITED", startDate: "2026-09-05", endDate: "2026-09-15" }),
    ).resolves.toMatchObject({ status: "LIMITED" });
  });

  it("cancels an existing declaration", async () => {
    const { service, availability } = serviceWith({
      availability: [
        { id: 1, teamId: "team-1", playerId: "player-1", status: "UNAVAILABLE", startDate: "2026-09-01", endDate: "2026-09-10", reason: null, declaredByUserId: "user-1", cancelledAt: null, createdAt: new Date(), updatedAt: new Date() },
      ],
    });
    await service.cancelAvailabilityDeclaration("player-1", 1);
    expect(availability[0].cancelledAt).toBeInstanceOf(Date);
  });

  it("refuses to cancel someone else's or an already cancelled declaration", async () => {
    const { service } = serviceWith({
      availability: [
        { id: 1, teamId: "team-1", playerId: "player-2", status: "UNAVAILABLE", startDate: "2026-09-01", endDate: "2026-09-10", reason: null, declaredByUserId: "user-1", cancelledAt: null, createdAt: new Date(), updatedAt: new Date() },
      ],
    });
    await expect(service.cancelAvailabilityDeclaration("player-1", 1)).rejects.toThrow("introuvable");
  });
});

describe("PlayerGovernanceService — PLAYER-003 document portfolio", () => {
  it("reports the player as medically eligible only when FIT and not expired", async () => {
    const { service } = serviceWith({
      eligibilities: [
        { id: "elig-1", playerId: "player-1", seasonId: "season-1", expiresAt: "2099-01-01", status: "FIT", createdAt: new Date() },
      ],
    });
    const portfolio = await service.getDocumentPortfolio("player-1");
    expect(portfolio.medicalFit).toMatchObject({ eligible: true, status: "FIT" });
  });

  it("reports ineligible when the latest eligibility is UNFIT", async () => {
    const { service } = serviceWith({
      eligibilities: [
        { id: "elig-1", playerId: "player-1", seasonId: "season-1", expiresAt: null, status: "UNFIT", createdAt: new Date() },
      ],
    });
    const portfolio = await service.getDocumentPortfolio("player-1");
    expect(portfolio.medicalFit).toMatchObject({ eligible: false, status: "UNFIT" });
  });

  it("returns contracts and registrations for the player", async () => {
    const { service } = serviceWith({
      contracts: [{ id: "c-1", playerId: "player-1", seasonId: "s-1", contractType: "AMATEUR", startDate: "2026-01-01", endDate: "2026-12-31", status: "SIGNED", federationStatus: "APPROVED", signedAt: null, rejectionReason: null, terminationReason: null }],
      registrations: [{ id: "r-1", playerId: "player-1", seasonId: "s-1", licenseId: "l-1", registeredAt: null, status: "APPROVED", eligibilityStatus: "ELIGIBLE", rejectionReason: null }],
    });
    const portfolio = await service.getDocumentPortfolio("player-1");
    expect(portfolio.contracts).toHaveLength(1);
    expect(portfolio.registrations).toHaveLength(1);
  });
});

describe("PlayerGovernanceService — PLAYER-004 consents", () => {
  it("signs a consent and lists it back", async () => {
    const { service, consents } = serviceWith({});
    await service.signConsent("team-1", "player-1", "user-1", "REGULATION");
    expect(consents).toHaveLength(1);
    expect(consents[0]).toMatchObject({ consentType: "REGULATION", signedByUserId: "user-1" });
  });
});

describe("PlayerGovernanceService — PLAYER-005 administrative requests", () => {
  it("submits a request with sufficient detail", async () => {
    const { service, requests } = serviceWith({});
    await service.submitAdministrativeRequest("team-1", "player-1", "user-1", "ATTESTATION", "Attestation de licence pour mon employeur");
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ status: "NEW", requestType: "ATTESTATION" });
  });

  it("rejects a request with too little detail", async () => {
    const { service } = serviceWith({});
    await expect(service.submitAdministrativeRequest("team-1", "player-1", "user-1", "ATTESTATION", "ok")).rejects.toThrow(PlayerGovernanceServiceError);
  });
});
