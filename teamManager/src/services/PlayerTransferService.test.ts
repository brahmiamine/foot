import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { Player } from "@/entities/Player";
import { Team } from "@/entities/Team";
import { TeamMember } from "@/entities/TeamMember";

let dataSource: DataSource;

vi.mock("@/lib/database", () => ({
  getDataSource: async () => dataSource,
}));

beforeEach(async () => {
  dataSource = await createTestDataSource();
});

afterEach(async () => {
  await dataSource.destroy();
});

async function seedTeam(overrides: Partial<Team> = {}): Promise<Team> {
  const repo = dataSource.getRepository(Team);
  return repo.save(
    repo.create({
      id: randomUUID(),
      nom: "Club",
      teamType: "club",
      sport: "football",
      ageCategory: "seniors",
      ...overrides,
    }),
  );
}

async function seedPlayer(teamId: string, overrides: Partial<Player> = {}): Promise<Player> {
  const repo = dataSource.getRepository(Player);
  return repo.save(
    repo.create({
      id: randomUUID(),
      firstNameFr: "Sami",
      lastNameFr: "Trabelsi",
      number: 10,
      teamId,
      ...overrides,
    }),
  );
}

async function seedMembership(teamId: string, playerId: string, startDate: string): Promise<void> {
  const repo = dataSource.getRepository(TeamMember);
  await repo.save(repo.create({ teamId, playerId, status: "ACTIVE", startDate: new Date(startDate) }));
}

describe("createTransfer", () => {
  it("rejects a transfer to the same club", async () => {
    const { createTransfer } = await import("./PlayerTransferService");
    const team = await seedTeam();
    const player = await seedPlayer(team.id);

    await expect(
      createTransfer({
        playerId: player.id,
        fromTeamId: team.id,
        toTeamId: team.id,
        transferType: "PERMANENT",
        effectiveDate: "2026-01-15",
      }),
    ).rejects.toThrow(/différents/);
  });

  it("rejects an unknown player", async () => {
    const { createTransfer } = await import("./PlayerTransferService");
    const fromTeam = await seedTeam();
    const toTeam = await seedTeam();

    await expect(
      createTransfer({
        playerId: randomUUID(),
        fromTeamId: fromTeam.id,
        toTeamId: toTeam.id,
        transferType: "PERMANENT",
        effectiveDate: "2026-01-15",
      }),
    ).rejects.toThrow(/introuvable/);
  });

  it("rejects when the source club does not match the player's current club", async () => {
    const { createTransfer } = await import("./PlayerTransferService");
    const actualTeam = await seedTeam();
    const wrongFromTeam = await seedTeam();
    const toTeam = await seedTeam();
    const player = await seedPlayer(actualTeam.id);

    await expect(
      createTransfer({
        playerId: player.id,
        fromTeamId: wrongFromTeam.id,
        toTeamId: toTeam.id,
        transferType: "PERMANENT",
        effectiveDate: "2026-01-15",
      }),
    ).rejects.toThrow(/club source ne correspond pas/);
  });

  it("rejects an unknown destination club", async () => {
    const { createTransfer } = await import("./PlayerTransferService");
    const fromTeam = await seedTeam();
    const player = await seedPlayer(fromTeam.id);

    await expect(
      createTransfer({
        playerId: player.id,
        fromTeamId: fromTeam.id,
        toTeamId: randomUUID(),
        transferType: "PERMANENT",
        effectiveDate: "2026-01-15",
      }),
    ).rejects.toThrow(/destination introuvable/);
  });

  it("creates a PENDING transfer without touching Player.teamId", async () => {
    const { createTransfer } = await import("./PlayerTransferService");
    const fromTeam = await seedTeam();
    const toTeam = await seedTeam();
    const player = await seedPlayer(fromTeam.id);

    const transfer = await createTransfer({
      playerId: player.id,
      fromTeamId: fromTeam.id,
      toTeamId: toTeam.id,
      transferType: "LOAN",
      effectiveDate: "2026-01-15",
      loanStartDate: "2026-01-15",
      loanEndDate: "2026-06-30",
    });

    expect(transfer.status).toBe("PENDING");
    const reloadedPlayer = await dataSource.getRepository(Player).findOne({ where: { id: player.id } });
    expect(reloadedPlayer?.teamId).toBe(fromTeam.id);
  });
});

describe("completeTransfer (migration.md §20 — transaction unique)", () => {
  it("preserves Player.id, updates Player.teamId, and closes/opens cms_team_members atomically", async () => {
    const { createTransfer, completeTransfer } = await import("./PlayerTransferService");
    const fromTeam = await seedTeam();
    const toTeam = await seedTeam();
    const player = await seedPlayer(fromTeam.id);
    await seedMembership(fromTeam.id, player.id, "2024-08-01");

    const transfer = await createTransfer({
      playerId: player.id,
      fromTeamId: fromTeam.id,
      toTeamId: toTeam.id,
      transferType: "PERMANENT",
      effectiveDate: "2026-01-15",
    });

    const completed = await completeTransfer(transfer.id, "federation-admin@example.com");

    expect(completed.status).toBe("COMPLETED");
    expect(completed.approvedBy).toBe("federation-admin@example.com");

    const reloadedPlayer = await dataSource.getRepository(Player).findOne({ where: { id: player.id } });
    expect(reloadedPlayer?.id).toBe(player.id); // Player.id jamais recréé
    expect(reloadedPlayer?.teamId).toBe(toTeam.id);

    const memberships = await dataSource.getRepository(TeamMember).find({ where: { playerId: player.id } });
    expect(memberships).toHaveLength(2);

    const oldMembership = memberships.find((m) => m.teamId === fromTeam.id)!;
    expect(oldMembership.status).toBe("ENDED");

    const newMembership = memberships.find((m) => m.teamId === toTeam.id)!;
    expect(newMembership.status).toBe("ACTIVE");
  });

  it("rejects completing the same transfer twice (idempotence / double validation concurrente)", async () => {
    const { createTransfer, completeTransfer } = await import("./PlayerTransferService");
    const fromTeam = await seedTeam();
    const toTeam = await seedTeam();
    const player = await seedPlayer(fromTeam.id);

    const transfer = await createTransfer({
      playerId: player.id,
      fromTeamId: fromTeam.id,
      toTeamId: toTeam.id,
      transferType: "PERMANENT",
      effectiveDate: "2026-01-15",
    });

    await completeTransfer(transfer.id);
    await expect(completeTransfer(transfer.id)).rejects.toThrow(/déjà complété/);

    // Une seconde tentative n'a pas dû créer une deuxième affiliation ACTIVE.
    const memberships = await dataSource.getRepository(TeamMember).find({ where: { playerId: player.id, status: "ACTIVE" } });
    expect(memberships).toHaveLength(1);
  });

  it("rejects completing a transfer whose player already moved to a different club", async () => {
    const { createTransfer, completeTransfer } = await import("./PlayerTransferService");
    const fromTeam = await seedTeam();
    const toTeam = await seedTeam();
    const thirdTeam = await seedTeam();
    const player = await seedPlayer(fromTeam.id);

    const transfer = await createTransfer({
      playerId: player.id,
      fromTeamId: fromTeam.id,
      toTeamId: toTeam.id,
      transferType: "PERMANENT",
      effectiveDate: "2026-01-15",
    });

    // Le joueur change de club par un autre biais avant l'homologation de ce transfert.
    await dataSource.getRepository(Player).update({ id: player.id }, { teamId: thirdTeam.id });

    await expect(completeTransfer(transfer.id)).rejects.toThrow(/n'appartient plus au club source/);
  });

  it("rejects completing a CANCELLED transfer", async () => {
    const { createTransfer, completeTransfer, closeTransfer } = await import("./PlayerTransferService");
    const fromTeam = await seedTeam();
    const toTeam = await seedTeam();
    const player = await seedPlayer(fromTeam.id);

    const transfer = await createTransfer({
      playerId: player.id,
      fromTeamId: fromTeam.id,
      toTeamId: toTeam.id,
      transferType: "PERMANENT",
      effectiveDate: "2026-01-15",
    });
    await closeTransfer(transfer.id, { status: "CANCELLED", reason: "Accord rompu" });

    await expect(completeTransfer(transfer.id)).rejects.toThrow(/cancelled/i);
  });
});

describe("closeTransfer", () => {
  it("cannot cancel/reject a transfer that is already COMPLETED", async () => {
    const { createTransfer, completeTransfer, closeTransfer } = await import("./PlayerTransferService");
    const fromTeam = await seedTeam();
    const toTeam = await seedTeam();
    const player = await seedPlayer(fromTeam.id);

    const transfer = await createTransfer({
      playerId: player.id,
      fromTeamId: fromTeam.id,
      toTeamId: toTeam.id,
      transferType: "PERMANENT",
      effectiveDate: "2026-01-15",
    });
    await completeTransfer(transfer.id);

    await expect(closeTransfer(transfer.id, { status: "REJECTED" })).rejects.toThrow(/déjà complété/);
  });
});
