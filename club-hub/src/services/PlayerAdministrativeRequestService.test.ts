import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { PlayerAdministrativeRequest } from "@/entities/PlayerAdministrativeRequest";

let dataSource: DataSource;

vi.mock("@/lib/database", () => ({ getDataSource: async () => dataSource }));

beforeEach(async () => {
  dataSource = await createTestDataSource();
});
afterEach(async () => dataSource.destroy());

async function seedRequest(overrides: Partial<PlayerAdministrativeRequest> = {}) {
  const repo = dataSource.getRepository(PlayerAdministrativeRequest);
  return repo.save(
    repo.create({
      id: randomUUID(),
      teamId: "team-1",
      playerId: "player-1",
      requesterUserId: "user-1",
      requestType: "ATTESTATION",
      details: "Attestation de licence",
      status: "NEW",
      ...overrides,
    }),
  );
}

describe("PlayerAdministrativeRequestService — PLAYER-005", () => {
  it("lists requests for a team, most recent first", async () => {
    const { PlayerAdministrativeRequestService } = await import("./PlayerAdministrativeRequestService");
    await seedRequest({ id: randomUUID(), details: "Première" });
    await seedRequest({ id: randomUUID(), details: "Seconde" });
    const list = await new PlayerAdministrativeRequestService().listForTeam("team-1");
    expect(list).toHaveLength(2);
  });

  it("only lists NEW/IN_PROGRESS requests as open", async () => {
    const { PlayerAdministrativeRequestService } = await import("./PlayerAdministrativeRequestService");
    await seedRequest({ id: randomUUID(), status: "NEW" });
    await seedRequest({ id: randomUUID(), status: "FULFILLED", resolvedAt: new Date() });
    const open = await new PlayerAdministrativeRequestService().listOpenForTeam("team-1");
    expect(open).toHaveLength(1);
    expect(open[0].status).toBe("NEW");
  });

  it("marks a request fulfilled with a staff note and resolution timestamp", async () => {
    const { PlayerAdministrativeRequestService } = await import("./PlayerAdministrativeRequestService");
    const request = await seedRequest();
    const updated = await new PlayerAdministrativeRequestService().updateStatus(request.id, "team-1", "staff-1", "FULFILLED", "Voici votre attestation");
    expect(updated.status).toBe("FULFILLED");
    expect(updated.staffUserId).toBe("staff-1");
    expect(updated.staffNote).toBe("Voici votre attestation");
    expect(updated.resolvedAt).toBeInstanceOf(Date);
  });

  it("clears resolvedAt when moved back to IN_PROGRESS", async () => {
    const { PlayerAdministrativeRequestService } = await import("./PlayerAdministrativeRequestService");
    const request = await seedRequest();
    const service = new PlayerAdministrativeRequestService();
    await service.updateStatus(request.id, "team-1", "staff-1", "IN_PROGRESS");
    const updated = await service.updateStatus(request.id, "team-1", "staff-1", "REJECTED", "Non éligible");
    expect(updated.status).toBe("REJECTED");
    expect(updated.resolvedAt).toBeInstanceOf(Date);
  });

  it("never resolves a request scoped to a different team", async () => {
    const { PlayerAdministrativeRequestService } = await import("./PlayerAdministrativeRequestService");
    const request = await seedRequest({ id: randomUUID(), teamId: "team-1" });
    await expect(
      new PlayerAdministrativeRequestService().updateStatus(request.id, "team-2", "staff-1", "FULFILLED"),
    ).rejects.toThrow("introuvable");
  });
});
