import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { SignJWT } from "jose";
import { createTestDataSource } from "@/test/testDataSource";
import { seedUser } from "@/test/fixtures";

let dataSource: DataSource;

vi.mock("@/lib/db", () => ({
  getDataSource: async () => dataSource,
}));

beforeEach(async () => {
  dataSource = await createTestDataSource();
  process.env.SSO_JWT_SECRET = "test-secret-at-least-32-bytes-long!!";
});

afterEach(async () => {
  await dataSource.destroy();
});

/** TS-34 — tokenVersion / vérification de session. */
describe("verifySessionToken", () => {
  it("accepts a token whose tokenVersion matches the account's current generation", async () => {
    const { verifySessionToken, issueSession } = await import("./session");
    const user = await seedUser(dataSource, { id: "user-1", tokenVersion: 2 });
    const { NextResponse } = await import("next/server");
    const response = await issueSession(NextResponse.json({}), {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      teamId: user.teamId,
      tokenVersion: 2,
    });
    const token = response.cookies.get("foot_sso_session")?.value;

    const result = await verifySessionToken(token!);

    expect(result?.id).toBe("user-1");
  });

  it("rejects a token whose tokenVersion is stale (password changed / MFA changed / logout everywhere)", async () => {
    const { verifySessionToken } = await import("./session");
    await seedUser(dataSource, { id: "user-1", tokenVersion: 5 });
    const token = await new SignJWT({ email: "user1@example.com", name: "User", role: "SUPERADMIN", teamId: null, tokenVersion: 2 })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-1")
      .setIssuer("foot-sso")
      .setIssuedAt()
      .setExpirationTime("12h")
      .sign(new TextEncoder().encode(process.env.SSO_JWT_SECRET));

    const result = await verifySessionToken(token);

    expect(result).toBeNull();
  });

  it("treats a pre-tokenVersion-migration token (no claim at all) as generation 0", async () => {
    const { verifySessionToken } = await import("./session");
    await seedUser(dataSource, { id: "user-1", tokenVersion: 0 });
    const token = await new SignJWT({ email: "user1@example.com", name: "User", role: "SUPERADMIN", teamId: null })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-1")
      .setIssuer("foot-sso")
      .setIssuedAt()
      .setExpirationTime("12h")
      .sign(new TextEncoder().encode(process.env.SSO_JWT_SECRET));

    const result = await verifySessionToken(token);

    expect(result?.id).toBe("user-1");
  });

  it("rejects a token for a deactivated account", async () => {
    const { verifySessionToken } = await import("./session");
    await seedUser(dataSource, { id: "user-1", tokenVersion: 0, isActive: false });
    const token = await new SignJWT({ email: "user1@example.com", name: "User", role: "SUPERADMIN", teamId: null, tokenVersion: 0 })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-1")
      .setIssuer("foot-sso")
      .setIssuedAt()
      .setExpirationTime("12h")
      .sign(new TextEncoder().encode(process.env.SSO_JWT_SECRET));

    const result = await verifySessionToken(token);

    expect(result).toBeNull();
  });

  it("rejects a token for a deleted account", async () => {
    const { verifySessionToken } = await import("./session");
    const token = await new SignJWT({ email: "ghost@example.com", name: "Ghost", role: "SUPERADMIN", teamId: null, tokenVersion: 0 })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("no-such-user")
      .setIssuer("foot-sso")
      .setIssuedAt()
      .setExpirationTime("12h")
      .sign(new TextEncoder().encode(process.env.SSO_JWT_SECRET));

    const result = await verifySessionToken(token);

    expect(result).toBeNull();
  });

  it("rejects a token signed with the wrong secret", async () => {
    const { verifySessionToken } = await import("./session");
    await seedUser(dataSource, { id: "user-1", tokenVersion: 0 });
    const token = await new SignJWT({ email: "user1@example.com", name: "User", role: "SUPERADMIN", teamId: null, tokenVersion: 0 })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-1")
      .setIssuer("foot-sso")
      .setIssuedAt()
      .setExpirationTime("12h")
      .sign(new TextEncoder().encode("a-completely-different-secret-value"));

    const result = await verifySessionToken(token);

    expect(result).toBeNull();
  });
});
