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

async function readOneEvent(response: Response): Promise<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const { value } = await reader.read();
  await reader.cancel();
  return decoder.decode(value);
}

/** TS-42 — SSE : /api/live/[matchId]/stream. */
describe("GET /api/live/[matchId]/stream", () => {
  it("returns 404 for an unknown match, without opening a stream", async () => {
    const { GET } = await import("./route");

    const response = await GET(new Request("http://localhost/api/live/does-not-exist/stream"), {
      params: Promise.resolve({ matchId: "does-not-exist" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 404 for a match hidden by the club", async () => {
    const { GET } = await import("./route");
    const away = await seedTeam(dataSource);
    const match = await seedMatch(dataSource, {
      equipeHome: obTeam!.id,
      equipeAway: away.id,
      isPublicVisible: false,
    });

    const response = await GET(new Request(`http://localhost/api/live/${match.id}/stream`), {
      params: Promise.resolve({ matchId: match.id }),
    });

    expect(response.status).toBe(404);
  });

  it("streams an initial 'update' event with status/score/events for a visible match", async () => {
    const { GET } = await import("./route");
    const away = await seedTeam(dataSource);
    const match = await seedMatch(dataSource, {
      equipeHome: obTeam!.id,
      equipeAway: away.id,
      status: "IN_PROGRESS",
      isPublicVisible: true,
    });

    const response = await GET(new Request(`http://localhost/api/live/${match.id}/stream`), {
      params: Promise.resolve({ matchId: match.id }),
    });

    expect(response.headers.get("content-type")).toBe("text/event-stream");
    const chunk = await readOneEvent(response);
    expect(chunk).toContain("event: update");
    expect(chunk).toContain('"status":"IN_PROGRESS"');
  });

  it("sends a 'closed' event and ends the stream for a match already FINISHED", async () => {
    const { GET } = await import("./route");
    const away = await seedTeam(dataSource);
    const match = await seedMatch(dataSource, {
      equipeHome: obTeam!.id,
      equipeAway: away.id,
      status: "FINISHED",
      isPublicVisible: true,
    });

    const response = await GET(new Request(`http://localhost/api/live/${match.id}/stream`), {
      params: Promise.resolve({ matchId: match.id }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    const first = await reader.read();
    const second = await reader.read();
    const combined = decoder.decode(first.value ?? new Uint8Array()) + decoder.decode(second.value ?? new Uint8Array());
    await reader.cancel();

    expect(combined).toContain("event: closed");
  });

  /** TASK-P0-011 : la table `matches` est partagée entre tous les clubs. */
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

    const response = await GET(new Request(`http://localhost/api/live/${otherMatch.id}/stream`), {
      params: Promise.resolve({ matchId: otherMatch.id }),
    });

    expect(response.status).toBe(404);
  });
});
