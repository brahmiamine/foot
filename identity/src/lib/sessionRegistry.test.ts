import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { generateKeyPairSync } from "crypto";
import { decodeJwt } from "jose";
import { createTestDataSource } from "@/test/testDataSource";
import { seedUser } from "@/test/fixtures";
import { UserSession } from "@/entities/UserSession";
import { resetJwtKeyCache } from "@/lib/jwtKeys";

let dataSource: DataSource;

vi.mock("@/lib/db", () => ({ getDataSource: async () => dataSource }));

function generateTestRsaPem(): string {
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  return privateKey;
}

beforeEach(async () => {
  dataSource = await createTestDataSource();
  process.env.SSO_JWT_PRIVATE_KEY = generateTestRsaPem();
  process.env.SSO_JWT_KID = "session-registry-test-kid";
  delete process.env.SSO_JWT_PRIVATE_KEY_PREVIOUS;
  delete process.env.SSO_JWT_KID_PREVIOUS;
  resetJwtKeyCache();
});

afterEach(async () => {
  await dataSource.destroy();
});

describe("session registry", () => {
  it("does not revive an expired session when a token is reissued", async () => {
    const user = await seedUser(dataSource, { id: "user-1", tokenVersion: 3 });
    const repo = dataSource.getRepository(UserSession);
    const expiredAt = new Date(Date.now() - 60_000);
    await repo.save(
      repo.create({
        id: "expired-session",
        userId: user.id,
        tokenVersion: user.tokenVersion,
        ipAddress: null,
        userAgent: null,
        lastSeenAt: new Date(Date.now() - 120_000),
        expiresAt: expiredAt,
        revokedAt: null,
        revokedReason: null,
      }),
    );

    const { createOrRefreshSession } = await import("./sessionRegistry");
    const replacement = await createOrRefreshSession({
      userId: user.id,
      tokenVersion: user.tokenVersion,
      sessionId: "expired-session",
      ttlSeconds: 3600,
    });

    expect(replacement).not.toBe("expired-session");
    expect((await repo.findOneByOrFail({ id: "expired-session" })).expiresAt).toEqual(expiredAt);
  });

  it("revokes one session without invalidating another session for the same user", async () => {
    const user = await seedUser(dataSource, { id: "user-1", tokenVersion: 1 });
    const { NextResponse } = await import("next/server");
    const { issueSession, verifySessionToken } = await import("./session");
    const { revokeUserSession } = await import("./sessionRegistry");
    const ssoUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      teamId: user.teamId ?? null,
      tokenVersion: user.tokenVersion,
    };

    const responseA = await issueSession(NextResponse.json({}), ssoUser);
    const responseB = await issueSession(NextResponse.json({}), ssoUser);
    const tokenA = responseA.cookies.get("foot_sso_session")?.value;
    const tokenB = responseB.cookies.get("foot_sso_session")?.value;
    if (!tokenA || !tokenB) throw new Error("Expected session cookies");

    const sidA = decodeJwt(tokenA).sid;
    const sidB = decodeJwt(tokenB).sid;
    expect(typeof sidA).toBe("string");
    expect(typeof sidB).toBe("string");
    expect(sidA).not.toBe(sidB);

    await revokeUserSession(user.id, sidA as string);

    expect(await verifySessionToken(tokenA)).toBeNull();
    expect((await verifySessionToken(tokenB))?.id).toBe(user.id);
  });

  it("never lets one user revoke another user's session", async () => {
    const userA = await seedUser(dataSource, { id: "user-a", email: "a@example.com" });
    const userB = await seedUser(dataSource, { id: "user-b", email: "b@example.com" });
    const { createOrRefreshSession, revokeUserSession, validateRegisteredSession } = await import(
      "./sessionRegistry"
    );
    const sid = await createOrRefreshSession({
      userId: userB.id,
      tokenVersion: userB.tokenVersion,
      ttlSeconds: 3600,
    });

    expect(await revokeUserSession(userA.id, sid)).toBe(false);
    expect(
      await validateRegisteredSession({
        sessionId: sid,
        userId: userB.id,
        tokenVersion: userB.tokenVersion,
      }),
    ).toBe(true);
  });
});
