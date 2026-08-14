import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { Player } from "@/entities/Player";
import { Team } from "@/entities/Team";
import { TeamMember } from "@/entities/TeamMember";

let dataSource: DataSource;

vi.mock("@/lib/database", () => ({ getDataSource: async () => dataSource }));
vi.mock("@/lib/notificationClient", () => ({ notify: vi.fn(async () => undefined) }));

beforeEach(async () => { dataSource = await createTestDataSource(); });
afterEach(async () => { await dataSource.destroy(); });

async function seedTeam(overrides: Partial<Team> = {}): Promise<Team> {
  const repo = dataSource.getRepository(Team);
  return repo.save(repo.create({ id: randomUUID(), nom: "Club", teamType: "club", sport: "football", ageCategory: "seniors", ...overrides }));
}

async function seedPlayer(teamId: string): Promise<Player> {
  const repo = dataSource.getRepository(Player);
  return repo.save(repo.create({ id: randomUUID(), firstNameFr: "Sami", lastNameFr: "Trabelsi", number: 10, teamId }));
}

async function seedMembership(teamId: string, playerId: string): Promise<void> {
  const repo = dataSource.getRepository(TeamMember);
  await repo.save(repo.create({ teamId, playerId, status: "ACTIVE", startDate: new Date("2024-08-01") }));
}

describe("PlayerTransferService workflow", () => {
  it("creates PENDING without changing the player's current club", async () => {
    const { createTransfer } = await import("./PlayerTransferService");
    const from = await seedTeam(); const to = await seedTeam(); const player = await seedPlayer(from.id);
    const transfer = await createTransfer({ playerId: player.id, fromTeamId: from.id, toTeamId: to.id, transferType: "PERMANENT", effectiveDate: "2026-01-15" });
    expect(transfer.status).toBe("PENDING");
    expect((await dataSource.getRepository(Player).findOneByOrFail({ id: player.id })).teamId).toBe(from.id);
  });

  it("rejects homologation before destination approval", async () => {
    const { createTransfer, completeTransfer } = await import("./PlayerTransferService");
    const from = await seedTeam(); const to = await seedTeam(); const player = await seedPlayer(from.id);
    const transfer = await createTransfer({ playerId: player.id, fromTeamId: from.id, toTeamId: to.id, transferType: "PERMANENT", effectiveDate: "2026-01-15" });
    await expect(completeTransfer(transfer.id, "federation@example.com")).rejects.toThrow(/doit approuver/i);
  });

  it("moves PENDING to APPROVED only through destination approval", async () => {
    const { createTransfer, approveDestinationTransfer } = await import("./PlayerTransferService");
    const from = await seedTeam(); const to = await seedTeam(); const player = await seedPlayer(from.id);
    const transfer = await createTransfer({ playerId: player.id, fromTeamId: from.id, toTeamId: to.id, transferType: "PERMANENT", effectiveDate: "2026-01-15" });
    const approved = await approveDestinationTransfer(transfer.id, "destination@example.com");
    expect(approved.status).toBe("APPROVED");
    expect(approved.destinationApprovedBy).toBe("destination@example.com");
    expect(approved.destinationApprovedAt).toBeTruthy();
  });

  it("preserves Player.id and changes membership atomically after approval + homologation", async () => {
    const { createTransfer, approveDestinationTransfer, completeTransfer } = await import("./PlayerTransferService");
    const from = await seedTeam(); const to = await seedTeam(); const player = await seedPlayer(from.id);
    await seedMembership(from.id, player.id);
    const transfer = await createTransfer({ playerId: player.id, fromTeamId: from.id, toTeamId: to.id, transferType: "PERMANENT", effectiveDate: "2026-01-15" });
    await approveDestinationTransfer(transfer.id, "destination@example.com");
    const completed = await completeTransfer(transfer.id, "federation@example.com");
    expect(completed.status).toBe("COMPLETED");
    expect(completed.homologatedBy).toBe("federation@example.com");
    const reloaded = await dataSource.getRepository(Player).findOneByOrFail({ id: player.id });
    expect(reloaded.id).toBe(player.id); expect(reloaded.teamId).toBe(to.id);
    const memberships = await dataSource.getRepository(TeamMember).find({ where: { playerId: player.id } });
    expect(memberships.find((m) => m.teamId === from.id)?.status).toBe("ENDED");
    expect(memberships.find((m) => m.teamId === to.id)?.status).toBe("ACTIVE");
  });

  it("blocks homologation when the destination club has an active TRANSFER_BAN sanction (migration-v2 P0-009)", async () => {
    const { createTransfer, approveDestinationTransfer, completeTransfer } = await import("./PlayerTransferService");
    const { ClubSanction } = await import("@/entities/ClubSanction");
    const from = await seedTeam(); const to = await seedTeam(); const player = await seedPlayer(from.id);
    const transfer = await createTransfer({ playerId: player.id, fromTeamId: from.id, toTeamId: to.id, transferType: "PERMANENT", effectiveDate: "2026-01-15" });
    await approveDestinationTransfer(transfer.id, "destination@example.com");
    const sanctionRepo = dataSource.getRepository(ClubSanction);
    await sanctionRepo.save(sanctionRepo.create({ clubId: to.id, federationId: "fed-1", type: "TRANSFER_BAN", reason: "Dettes impayées", startsAt: new Date("2026-01-01"), status: "ACTIVE", createdBy: "federation-admin" }));
    await expect(completeTransfer(transfer.id, "federation@example.com")).rejects.toThrow(/interdiction de recrutement/i);
  });

  it("rejects replaying a completed transfer", async () => {
    const { createTransfer, approveDestinationTransfer, completeTransfer } = await import("./PlayerTransferService");
    const from = await seedTeam(); const to = await seedTeam(); const player = await seedPlayer(from.id);
    const transfer = await createTransfer({ playerId: player.id, fromTeamId: from.id, toTeamId: to.id, transferType: "PERMANENT", effectiveDate: "2026-01-15" });
    await approveDestinationTransfer(transfer.id, "destination@example.com");
    await completeTransfer(transfer.id, "federation@example.com");
    await expect(completeTransfer(transfer.id, "federation@example.com")).rejects.toThrow(/déjà complété/i);
  });

  it("rejects if the player moved elsewhere before homologation", async () => {
    const { createTransfer, approveDestinationTransfer, completeTransfer } = await import("./PlayerTransferService");
    const from = await seedTeam(); const to = await seedTeam(); const third = await seedTeam(); const player = await seedPlayer(from.id);
    const transfer = await createTransfer({ playerId: player.id, fromTeamId: from.id, toTeamId: to.id, transferType: "PERMANENT", effectiveDate: "2026-01-15" });
    await approveDestinationTransfer(transfer.id, "destination@example.com");
    await dataSource.getRepository(Player).update({ id: player.id }, { teamId: third.id });
    await expect(completeTransfer(transfer.id, "federation@example.com")).rejects.toThrow(/n'appartient plus/i);
  });

  it("rejects/cancels non-completed transfers and forbids closing a completed one", async () => {
    const { createTransfer, approveDestinationTransfer, completeTransfer, closeTransfer } = await import("./PlayerTransferService");
    const from = await seedTeam(); const to = await seedTeam(); const player = await seedPlayer(from.id);
    const transfer = await createTransfer({ playerId: player.id, fromTeamId: from.id, toTeamId: to.id, transferType: "PERMANENT", effectiveDate: "2026-01-15" });
    await approveDestinationTransfer(transfer.id, "destination@example.com");
    await completeTransfer(transfer.id, "federation@example.com");
    await expect(closeTransfer(transfer.id, { status: "REJECTED" })).rejects.toThrow(/déjà complété/i);
  });
});
