import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { seedUser } from "@/test/fixtures";

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

/** TS-34 — login. */
describe("authenticate", () => {
  it("returns the session payload for valid credentials", async () => {
    const { authenticate } = await import("./authenticate");
    await seedUser(dataSource, {
      id: "user-1",
      email: "admin@example.com",
      password: "s3cret!",
      role: "SUPERADMIN",
    });

    const result = await authenticate({ email: "admin@example.com", password: "s3cret!" });

    expect(result?.id).toBe("user-1");
    expect(result?.role).toBe("SUPERADMIN");
  });

  it("rejects a wrong password", async () => {
    const { authenticate } = await import("./authenticate");
    await seedUser(dataSource, { email: "admin@example.com", password: "s3cret!" });

    const result = await authenticate({ email: "admin@example.com", password: "wrong" });

    expect(result).toBeNull();
  });

  it("rejects an unknown email", async () => {
    const { authenticate } = await import("./authenticate");

    const result = await authenticate({ email: "nobody@example.com", password: "s3cret!" });

    expect(result).toBeNull();
  });

  it("rejects a deactivated account", async () => {
    const { authenticate } = await import("./authenticate");
    await seedUser(dataSource, { email: "admin@example.com", password: "s3cret!", isActive: false });

    const result = await authenticate({ email: "admin@example.com", password: "s3cret!" });

    expect(result).toBeNull();
  });

  it("rejects login before temporary account access starts", async () => {
    const { authenticate } = await import("./authenticate");
    await seedUser(dataSource, {
      email: "future@example.com",
      password: "s3cret!",
      role: "SUPERADMIN",
      accessValidFrom: new Date(Date.now() + 60_000),
    });

    expect(await authenticate({ email: "future@example.com", password: "s3cret!" })).toBeNull();
  });

  it("rejects login once temporary account access has expired", async () => {
    const { authenticate } = await import("./authenticate");
    await seedUser(dataSource, {
      email: "expired@example.com",
      password: "s3cret!",
      role: "SUPERADMIN",
      accessValidUntil: new Date(Date.now() - 60_000),
    });

    expect(await authenticate({ email: "expired@example.com", password: "s3cret!" })).toBeNull();
  });

  it("rejects SUPERADMIN login attempted with a teamId", async () => {
    const { authenticate } = await import("./authenticate");
    await seedUser(dataSource, { email: "admin@example.com", password: "s3cret!", role: "SUPERADMIN" });

    const result = await authenticate({ email: "admin@example.com", password: "s3cret!", teamId: "team-1" });

    expect(result).toBeNull();
  });

  it("allows ADMIN login only when teamId matches the account's club", async () => {
    const { authenticate } = await import("./authenticate");
    await seedUser(dataSource, {
      email: "club@example.com",
      password: "s3cret!",
      role: "ADMIN",
      teamId: "team-1",
    });

    const wrongTeam = await authenticate({ email: "club@example.com", password: "s3cret!", teamId: "team-2" });
    const noTeam = await authenticate({ email: "club@example.com", password: "s3cret!" });
    const rightTeam = await authenticate({ email: "club@example.com", password: "s3cret!", teamId: "team-1" });

    expect(wrongTeam).toBeNull();
    expect(noTeam).toBeNull();
    expect(rightTeam?.teamId).toBe("team-1");
  });

  it("allows MEMBER login without a teamId", async () => {
    const { authenticate } = await import("./authenticate");
    await seedUser(dataSource, { email: "member@example.com", password: "s3cret!", role: "MEMBER" });

    const result = await authenticate({ email: "member@example.com", password: "s3cret!" });

    expect(result?.role).toBe("MEMBER");
  });

  it("allows referee roles to login without selecting a club", async () => {
    const { authenticate } = await import("./authenticate");
    await seedUser(dataSource, { email: "referee@example.com", password: "s3cret!", role: "REFEREE" });

    const result = await authenticate({ email: "referee@example.com", password: "s3cret!" });
    const withClub = await authenticate({ email: "referee@example.com", password: "s3cret!", teamId: "team-1" });

    expect(result?.role).toBe("REFEREE");
    expect(result?.teamId).toBeNull();
    expect(withClub).toBeNull();
  });

  it("keeps PLAYER accounts scoped to their club", async () => {
    const { authenticate } = await import("./authenticate");
    await seedUser(dataSource, { email: "player@example.com", password: "s3cret!", role: "PLAYER", teamId: "team-1", playerId: "player-1" });

    const withoutClub = await authenticate({ email: "player@example.com", password: "s3cret!" });
    const rightClub = await authenticate({ email: "player@example.com", password: "s3cret!", teamId: "team-1" });

    expect(withoutClub).toBeNull();
    expect(rightClub?.playerId).toBe("player-1");
  });
});