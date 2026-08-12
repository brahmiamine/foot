import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { seedMatch, seedTeam } from "@/test/fixtures";

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

/** TS-36 — pages publiques : ne jamais exposer un match isPublicVisible=false. */
describe("PublicMatchService", () => {
  it("getNextMatch ignores matches hidden by the club (isPublicVisible=false)", async () => {
    const { PublicMatchService } = await import("./PublicMatchService");
    const home = await seedTeam(dataSource);
    const away = await seedTeam(dataSource);
    await seedMatch(dataSource, {
      equipeHome: home.id,
      equipeAway: away.id,
      status: "UPCOMING",
      isPublicVisible: false,
      date: new Date(Date.now() + 86_400_000),
    });

    const result = await new PublicMatchService().getNextMatch(home.id);

    expect(result).toBeNull();
  });

  it("getNextMatch returns the soonest visible upcoming match", async () => {
    const { PublicMatchService } = await import("./PublicMatchService");
    const home = await seedTeam(dataSource);
    const away = await seedTeam(dataSource);
    const soon = await seedMatch(dataSource, {
      equipeHome: home.id,
      equipeAway: away.id,
      date: new Date(Date.now() + 86_400_000),
    });
    await seedMatch(dataSource, {
      equipeHome: home.id,
      equipeAway: away.id,
      date: new Date(Date.now() + 7 * 86_400_000),
    });

    const result = await new PublicMatchService().getNextMatch(home.id);

    expect(result?.id).toBe(soon.id);
  });

  it("getNextMatch excludes matches already in the past (stale UPCOMING status)", async () => {
    const { PublicMatchService } = await import("./PublicMatchService");
    const home = await seedTeam(dataSource);
    const away = await seedTeam(dataSource);
    await seedMatch(dataSource, {
      equipeHome: home.id,
      equipeAway: away.id,
      date: new Date(Date.now() - 86_400_000),
    });

    const result = await new PublicMatchService().getNextMatch(home.id);

    expect(result).toBeNull();
  });

  it("getNextMatch keeps an IN_PROGRESS match regardless of its scheduled date", async () => {
    const { PublicMatchService } = await import("./PublicMatchService");
    const home = await seedTeam(dataSource);
    const away = await seedTeam(dataSource);
    const live = await seedMatch(dataSource, {
      equipeHome: home.id,
      equipeAway: away.id,
      status: "IN_PROGRESS",
      date: new Date(Date.now() - 3600_000),
    });

    const result = await new PublicMatchService().getNextMatch(home.id);

    expect(result?.id).toBe(live.id);
  });

  it("getRecentResults never includes a hidden match", async () => {
    const { PublicMatchService } = await import("./PublicMatchService");
    const home = await seedTeam(dataSource);
    const away = await seedTeam(dataSource);
    await seedMatch(dataSource, {
      equipeHome: home.id,
      equipeAway: away.id,
      status: "FINISHED",
      isPublicVisible: false,
      scoreHome: 2,
      scoreAway: 1,
    });

    const results = await new PublicMatchService().getRecentResults(home.id);

    expect(results).toHaveLength(0);
  });

  it("getRecentResults returns visible finished matches, most recent first", async () => {
    const { PublicMatchService } = await import("./PublicMatchService");
    const home = await seedTeam(dataSource);
    const away = await seedTeam(dataSource);
    await seedMatch(dataSource, {
      equipeHome: home.id,
      equipeAway: away.id,
      status: "FINISHED",
      date: new Date("2026-01-01"),
    });
    const recent = await seedMatch(dataSource, {
      equipeHome: home.id,
      equipeAway: away.id,
      status: "FINISHED",
      date: new Date("2026-06-01"),
    });

    const results = await new PublicMatchService().getRecentResults(home.id, 5);

    expect(results[0].id).toBe(recent.id);
  });
});
