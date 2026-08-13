import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import type { Team } from "@/entities/Team";
import { createTestDataSource } from "@/test/testDataSource";
import { seedMatch, seedTeam } from "@/test/fixtures";

let dataSource: DataSource;
let obTeam: Team | null;

vi.mock("@/lib/database", () => ({
  getDataSource: async () => dataSource,
}));

vi.mock("@/lib/ob-team", () => ({
  getObTeam: async () => obTeam,
}));

beforeEach(async () => {
  dataSource = await createTestDataSource();
  obTeam = await seedTeam(dataSource);
});

afterEach(async () => {
  await dataSource.destroy();
});

/** TS-36 — live API : ne jamais exposer un match non visible publiquement. */
describe("GET /api/live/[matchId]", () => {
  it("returns 404 for an unknown match", async () => {
    const { GET } = await import("./route");

    const response = await GET(new Request("http://localhost/api/live/does-not-exist"), {
      params: Promise.resolve({ matchId: "does-not-exist" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 404 for a match hidden by the club (isPublicVisible=false)", async () => {
    const { GET } = await import("./route");
    const away = await seedTeam(dataSource);
    const match = await seedMatch(dataSource, {
      equipeHome: obTeam!.id,
      equipeAway: away.id,
      isPublicVisible: false,
    });

    const response = await GET(new Request(`http://localhost/api/live/${match.id}`), {
      params: Promise.resolve({ matchId: match.id }),
    });

    expect(response.status).toBe(404);
  });

  it("returns status/score/events for a visible match", async () => {
    const { GET } = await import("./route");
    const away = await seedTeam(dataSource);
    const match = await seedMatch(dataSource, {
      equipeHome: obTeam!.id,
      equipeAway: away.id,
      status: "IN_PROGRESS",
      isPublicVisible: true,
    });

    const response = await GET(new Request(`http://localhost/api/live/${match.id}`), {
      params: Promise.resolve({ matchId: match.id }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("IN_PROGRESS");
    expect(body.events).toEqual([]);
    expect(body.score).toBeDefined();
  });

  /** TASK-P0-011 : la table `matches` est partagée entre tous les clubs. */
  describe("isolation multi-tenant (TASK-P0-011)", () => {
    it("returns 404 for a visible match that doesn't involve the OB team", async () => {
      const { GET } = await import("./route");
      const otherClubHome = await seedTeam(dataSource);
      const otherClubAway = await seedTeam(dataSource);
      const otherMatch = await seedMatch(dataSource, {
        equipeHome: otherClubHome.id,
        equipeAway: otherClubAway.id,
        status: "IN_PROGRESS",
        isPublicVisible: true,
      });

      const response = await GET(new Request(`http://localhost/api/live/${otherMatch.id}`), {
        params: Promise.resolve({ matchId: otherMatch.id }),
      });

      expect(response.status).toBe(404);
    });

    it("returns 404 when OB_TEAM_ID can't be resolved", async () => {
      obTeam = null;
      const { GET } = await import("./route");
      const home = await seedTeam(dataSource);
      const away = await seedTeam(dataSource);
      const match = await seedMatch(dataSource, {
        equipeHome: home.id,
        equipeAway: away.id,
        isPublicVisible: true,
      });

      const response = await GET(new Request(`http://localhost/api/live/${match.id}`), {
        params: Promise.resolve({ matchId: match.id }),
      });

      expect(response.status).toBe(404);
    });
  });
});
