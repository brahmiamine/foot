import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { seedBaseGraph } from "@/test/fixtures";
import { RefereeUnavailability } from "@/entities/RefereeUnavailability";

let dataSource: DataSource;

vi.mock("@/lib/db", () => ({
  getDataSource: async () => dataSource,
}));

beforeEach(async () => {
  dataSource = await createTestDataSource();
});

afterEach(async () => {
  await dataSource.destroy();
});

/** migration.md §11 (Phase 4) : identité officielle de match. */
describe("MatchOfficialAssignmentService", () => {
  describe("assign / findActiveAssignment", () => {
    it("has no active assignment for a user before one is created", async () => {
      const { MatchOfficialAssignmentService } = await import("./MatchOfficialAssignmentService");
      const { match } = await seedBaseGraph(dataSource);
      const service = new MatchOfficialAssignmentService();

      expect(await service.findActiveAssignment("referee-1", match.id)).toBeNull();
    });

    it("finds the active assignment once created", async () => {
      const { MatchOfficialAssignmentService } = await import("./MatchOfficialAssignmentService");
      const { match } = await seedBaseGraph(dataSource);
      const service = new MatchOfficialAssignmentService();

      await service.assign({ matchId: match.id, userId: "referee-1", role: "CENTER_REFEREE", assignedBy: "federation-admin@example.com" });

      const found = await service.findActiveAssignment("referee-1", match.id);
      expect(found).not.toBeNull();
      expect(found?.role).toBe("CENTER_REFEREE");
      expect(found?.status).toBe("ACTIVE");
    });

    it("does not authorize a user assigned to a DIFFERENT match", async () => {
      const { MatchOfficialAssignmentService } = await import("./MatchOfficialAssignmentService");
      const { match } = await seedBaseGraph(dataSource);
      const { match: otherMatch } = await seedBaseGraph(dataSource);
      const service = new MatchOfficialAssignmentService();

      await service.assign({ matchId: otherMatch.id, userId: "referee-1", role: "CENTER_REFEREE" });

      expect(await service.findActiveAssignment("referee-1", match.id)).toBeNull();
    });

    it("re-assigning the same user/role/match is idempotent (no duplicate row)", async () => {
      const { MatchOfficialAssignmentService } = await import("./MatchOfficialAssignmentService");
      const { match } = await seedBaseGraph(dataSource);
      const service = new MatchOfficialAssignmentService();

      const first = await service.assign({ matchId: match.id, userId: "referee-1", role: "CENTER_REFEREE" });
      const second = await service.assign({ matchId: match.id, userId: "referee-1", role: "CENTER_REFEREE" });

      expect(second.id).toBe(first.id);
      const all = await service.listForMatch(match.id);
      expect(all).toHaveLength(1);
    });

    it("allows two different officials to hold the same role (e.g. two assistant referees)", async () => {
      const { MatchOfficialAssignmentService } = await import("./MatchOfficialAssignmentService");
      const { match } = await seedBaseGraph(dataSource);
      const service = new MatchOfficialAssignmentService();

      await service.assign({ matchId: match.id, userId: "assistant-1", role: "ASSISTANT_REFEREE" });
      await service.assign({ matchId: match.id, userId: "assistant-2", role: "ASSISTANT_REFEREE" });

      const all = await service.listForMatch(match.id);
      expect(all).toHaveLength(2);
    });

    it("rejects an assignment when the official is unavailable on match day", async () => {
      const { MatchOfficialAssignmentService, MatchOfficialAssignmentError } = await import("./MatchOfficialAssignmentService");
      const { match } = await seedBaseGraph(dataSource);
      const repo = dataSource.getRepository(RefereeUnavailability);
      const matchDate = match.date!.toISOString().slice(0, 10);
      await repo.save(repo.create({ userId: "referee-1", startDate: matchDate, endDate: matchDate }));

      await expect(new MatchOfficialAssignmentService().assign({
        matchId: match.id,
        userId: "referee-1",
        role: "CENTER_REFEREE",
      })).rejects.toThrow(MatchOfficialAssignmentError);
    });

    it("ignores a cancelled unavailability", async () => {
      const { MatchOfficialAssignmentService } = await import("./MatchOfficialAssignmentService");
      const { match } = await seedBaseGraph(dataSource);
      const repo = dataSource.getRepository(RefereeUnavailability);
      const matchDate = match.date!.toISOString().slice(0, 10);
      await repo.save(repo.create({ userId: "referee-1", startDate: matchDate, endDate: matchDate, cancelledAt: new Date() }));

      await expect(new MatchOfficialAssignmentService().assign({
        matchId: match.id,
        userId: "referee-1",
        role: "CENTER_REFEREE",
      })).resolves.toMatchObject({ status: "ACTIVE" });
    });
  });

  describe("revoke", () => {
    it("revokes an assignment without deleting it (history preserved, §11 audit)", async () => {
      const { MatchOfficialAssignmentService } = await import("./MatchOfficialAssignmentService");
      const { match } = await seedBaseGraph(dataSource);
      const service = new MatchOfficialAssignmentService();

      const assignment = await service.assign({ matchId: match.id, userId: "referee-1", role: "CENTER_REFEREE" });
      const revoked = await service.revoke(assignment.id, "federation-admin@example.com");

      expect(revoked.status).toBe("REVOKED");
      expect(revoked.revokedBy).toBe("federation-admin@example.com");
      expect(revoked.revokedAt).not.toBeNull();

      // Toujours dans l'historique du match, mais plus autorisante.
      expect(await service.listForMatch(match.id)).toHaveLength(1);
      expect(await service.findActiveAssignment("referee-1", match.id)).toBeNull();
    });

    it("rejects revoking an already-revoked assignment", async () => {
      const { MatchOfficialAssignmentService, MatchOfficialAssignmentError } = await import("./MatchOfficialAssignmentService");
      const { match } = await seedBaseGraph(dataSource);
      const service = new MatchOfficialAssignmentService();

      const assignment = await service.assign({ matchId: match.id, userId: "referee-1", role: "CENTER_REFEREE" });
      await service.revoke(assignment.id);

      await expect(service.revoke(assignment.id)).rejects.toThrow(MatchOfficialAssignmentError);
    });

    it("a revoked official can be re-assigned to the same match", async () => {
      const { MatchOfficialAssignmentService } = await import("./MatchOfficialAssignmentService");
      const { match } = await seedBaseGraph(dataSource);
      const service = new MatchOfficialAssignmentService();

      const first = await service.assign({ matchId: match.id, userId: "referee-1", role: "CENTER_REFEREE" });
      await service.revoke(first.id);

      const second = await service.assign({ matchId: match.id, userId: "referee-1", role: "CENTER_REFEREE" });

      expect(second.id).not.toBe(first.id);
      expect(await service.findActiveAssignment("referee-1", match.id)).not.toBeNull();
    });
  });
});
