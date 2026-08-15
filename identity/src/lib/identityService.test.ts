import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import bcrypt from "bcryptjs";
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

/** TS-53/TS-54 — API Identity interne. */
describe("createUser", () => {
  it("creates an active user with a hashed password", async () => {
    const { createUser } = await import("./identityService");

    const result = await createUser({
      name: "Amine",
      email: "amine@example.com",
      password: "s3cret!",
      role: "ADMIN",
      teamId: "team-1",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.isActive).toBe(true);
      expect(result.user.role).toBe("ADMIN");
      expect(result.user.teamId).toBe("team-1");
    }

    const { User } = await import("@/entities/User");
    const stored = await dataSource.getRepository(User).findOne({ where: { email: "amine@example.com" } });
    expect(await bcrypt.compare("s3cret!", stored!.password)).toBe(true);
  });

  it("persists playerId for PLAYER accounts provisioned by another application", async () => {
    const { createUser } = await import("./identityService");

    const result = await createUser({
      name: "Player One",
      email: "player@example.com",
      password: "s3cret!",
      role: "PLAYER",
      teamId: "team-1",
      playerId: "player-1",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.user.playerId).toBe("player-1");
  });

  it("rejects an email already in use", async () => {
    const { createUser } = await import("./identityService");
    await seedUser(dataSource, { email: "amine@example.com" });

    const result = await createUser({
      name: "Amine",
      email: "amine@example.com",
      password: "s3cret!",
      role: "ADMIN",
      teamId: "team-1",
    });

    expect(result).toEqual({ ok: false, error: "email_taken" });
  });
});

describe("getUserById", () => {
  it("returns null for an unknown id", async () => {
    const { getUserById } = await import("./identityService");
    expect(await getUserById("nobody")).toBeNull();
  });

  it("returns the user for a known id", async () => {
    const { getUserById } = await import("./identityService");
    const user = await seedUser(dataSource, { id: "user-1" });

    const result = await getUserById("user-1");

    expect(result?.id).toBe(user.id);
  });
});

describe("listUsers", () => {
  it("filters accounts by teamId", async () => {
    const { listUsers } = await import("./identityService");
    await seedUser(dataSource, { id: "team-1-admin", email: "a@example.com", teamId: "team-1", role: "ADMIN" });
    await seedUser(dataSource, { id: "team-2-admin", email: "b@example.com", teamId: "team-2", role: "ADMIN" });

    const users = await listUsers({ teamId: "team-1" });

    expect(users.map((user) => user.id)).toEqual(["team-1-admin"]);
  });

  it("filters accounts by one or more roles", async () => {
    const { listUsers } = await import("./identityService");
    await seedUser(dataSource, { id: "referee", email: "ref@example.com", role: "REFEREE", teamId: null });
    await seedUser(dataSource, { id: "official", email: "off@example.com", role: "MATCH_OFFICIAL", teamId: null });
    await seedUser(dataSource, { id: "member", email: "member@example.com", role: "MEMBER", teamId: null });

    const users = await listUsers({ roles: ["REFEREE", "MATCH_OFFICIAL"] });

    expect(users.map((user) => user.id).sort()).toEqual(["official", "referee"]);
  });

  it("can distinguish team-scoped accounts from platform accounts", async () => {
    const { listUsers } = await import("./identityService");
    await seedUser(dataSource, { id: "club-account", email: "club@example.com", teamId: "team-1", role: "ADMIN" });
    await seedUser(dataSource, { id: "platform-account", email: "platform@example.com", teamId: null, role: "REFEREE" });

    expect((await listUsers({ hasTeam: true })).map((user) => user.id)).toEqual(["club-account"]);
    expect((await listUsers({ hasTeam: false })).map((user) => user.id)).toEqual(["platform-account"]);
  });
});

describe("updateUser", () => {
  it("disables an account and bumps tokenVersion (revokes existing sessions)", async () => {
    const { updateUser } = await import("./identityService");
    await seedUser(dataSource, { id: "user-1", isActive: true, tokenVersion: 3 });

    const result = await updateUser("user-1", { isActive: false });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.isActive).toBe(false);
    }
    const { User } = await import("@/entities/User");
    const stored = await dataSource.getRepository(User).findOne({ where: { id: "user-1" } });
    expect(stored?.tokenVersion).toBe(4);
  });

  it("re-enables an account", async () => {
    const { updateUser } = await import("./identityService");
    await seedUser(dataSource, { id: "user-1", isActive: false });

    const result = await updateUser("user-1", { isActive: true });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.user.isActive).toBe(true);
  });

  it("does not bump tokenVersion when isActive doesn't actually change", async () => {
    const { updateUser } = await import("./identityService");
    await seedUser(dataSource, { id: "user-1", isActive: true, tokenVersion: 2 });

    await updateUser("user-1", { isActive: true });

    const { User } = await import("@/entities/User");
    const stored = await dataSource.getRepository(User).findOne({ where: { id: "user-1" } });
    expect(stored?.tokenVersion).toBe(2);
  });

  it("updates the role", async () => {
    const { updateUser } = await import("./identityService");
    await seedUser(dataSource, { id: "user-1", role: "OBSERVATEUR" });

    const result = await updateUser("user-1", { role: "ADMIN" });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.user.role).toBe("ADMIN");
  });

  it("changes the password (hashed) and bumps tokenVersion", async () => {
    const { updateUser } = await import("./identityService");
    await seedUser(dataSource, { id: "user-1", tokenVersion: 1 });

    await updateUser("user-1", { password: "new-password!" });

    const { User } = await import("@/entities/User");
    const stored = await dataSource.getRepository(User).findOne({ where: { id: "user-1" } });
    expect(stored?.tokenVersion).toBe(2);
    expect(await bcrypt.compare("new-password!", stored!.password)).toBe(true);
  });

  it("returns not_found for an unknown id", async () => {
    const { updateUser } = await import("./identityService");
    expect(await updateUser("nobody", { isActive: false })).toEqual({ ok: false, error: "not_found" });
  });
});

describe("deleteUser", () => {
  it("removes the user", async () => {
    const { deleteUser } = await import("./identityService");
    await seedUser(dataSource, { id: "user-1" });

    const result = await deleteUser("user-1");

    expect(result).toEqual({ ok: true });
    const { User } = await import("@/entities/User");
    expect(await dataSource.getRepository(User).findOne({ where: { id: "user-1" } })).toBeNull();
  });

  it("returns not_found for an unknown id", async () => {
    const { deleteUser } = await import("./identityService");
    expect(await deleteUser("nobody")).toEqual({ ok: false, error: "not_found" });
  });
});
