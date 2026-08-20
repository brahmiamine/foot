import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { generateKeyPairSync } from "crypto";
import { decodeJwt, importPKCS8, SignJWT } from "jose";
import { User } from "@/entities/User";
import { createTestDataSource } from "@/test/testDataSource";
import { seedUser } from "@/test/fixtures";
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

async function signCurrent(
  subject: string,
  payload: Record<string, unknown>,
  options: { audience?: boolean; kid?: string } = {},
): Promise<string> {
  const key = await importPKCS8(process.env.SSO_JWT_PRIVATE_KEY!, "RS256");
  let jwt = new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", kid: options.kid ?? process.env.SSO_JWT_KID })
    .setSubject(subject)
    .setIssuer("foot-sso")
    .setIssuedAt()
    .setExpirationTime("12h");
  if (options.audience !== false) jwt = jwt.setAudience("foot-platform");
  return jwt.sign(key);
}

beforeEach(async () => {
  dataSource = await createTestDataSource();
  process.env.SSO_JWT_PRIVATE_KEY = generateTestRsaPem();
  process.env.SSO_JWT_KID = "test-kid-current";
  delete process.env.SSO_JWT_PRIVATE_KEY_PREVIOUS;
  delete process.env.SSO_JWT_KID_PREVIOUS;
  delete process.env.SSO_JWT_SECRET;
  resetJwtKeyCache();
});

afterEach(async () => {
  await dataSource.destroy();
});

describe("verifySessionToken", () => {
  it("accepts an RS256 token with matching audience and tokenVersion", async () => {
    const { verifySessionToken, issueSession } = await import("./session");
    const user = await seedUser(dataSource, { id: "user-1", tokenVersion: 2 });
    const { NextResponse } = await import("next/server");
    const response = await issueSession(NextResponse.json({}), {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      teamId: user.teamId ?? null,
      tokenVersion: 2,
    });
    const token = response.cookies.get("foot_sso_session")?.value;
    expect(typeof decodeJwt(token!).sid).toBe("string");
    expect((await verifySessionToken(token!))?.id).toBe("user-1");
  });

  it("rejects a stale tokenVersion", async () => {
    const { verifySessionToken } = await import("./session");
    await seedUser(dataSource, { id: "user-1", tokenVersion: 5 });
    const token = await signCurrent("user-1", {
      email: "user1@example.com",
      name: "User",
      role: "SUPERADMIN",
      teamId: null,
      tokenVersion: 2,
    });
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("still treats a token without tokenVersion as generation 0", async () => {
    const { verifySessionToken } = await import("./session");
    await seedUser(dataSource, { id: "user-1", tokenVersion: 0 });
    const token = await signCurrent("user-1", {
      email: "user1@example.com",
      name: "User",
      role: "SUPERADMIN",
      teamId: null,
    });
    expect((await verifySessionToken(token))?.id).toBe("user-1");
  });

  it("rejects a token without the required audience", async () => {
    const { verifySessionToken } = await import("./session");
    await seedUser(dataSource, { id: "user-1", tokenVersion: 0 });
    const token = await signCurrent(
      "user-1",
      { email: "user1@example.com", role: "SUPERADMIN", tokenVersion: 0 },
      { audience: false },
    );
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("rejects legacy HS256 session tokens", async () => {
    const { verifySessionToken } = await import("./session");
    await seedUser(dataSource, { id: "user-1", tokenVersion: 0 });
    const token = await new SignJWT({ email: "user1@example.com", role: "SUPERADMIN", tokenVersion: 0 })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-1")
      .setIssuer("foot-sso")
      .setAudience("foot-platform")
      .setExpirationTime("12h")
      .sign(new TextEncoder().encode("legacy-secret-at-least-32-bytes-long"));
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("rejects a token for a deactivated account", async () => {
    const { verifySessionToken } = await import("./session");
    await seedUser(dataSource, { id: "user-1", tokenVersion: 0, isActive: false });
    const token = await signCurrent("user-1", {
      email: "user1@example.com",
      role: "SUPERADMIN",
      tokenVersion: 0,
    });
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("rejects a token before temporary account access starts", async () => {
    const { verifySessionToken } = await import("./session");
    const { updateUser } = await import("./identityService");
    const user = await seedUser(dataSource, { id: "user-1", tokenVersion: 0 });
    const update = await updateUser(
      user.id,
      { accessValidFrom: new Date(Date.now() + 60_000) } as Parameters<typeof updateUser>[1] & {
        accessValidFrom: Date;
      },
    );
    expect(update.ok).toBe(true);
    const persisted = await dataSource.getRepository(User).findOneByOrFail({ id: user.id });

    const token = await signCurrent("user-1", {
      email: user.email,
      role: user.role,
      tokenVersion: persisted.tokenVersion,
    });
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("rejects a token after temporary account access expires", async () => {
    const { verifySessionToken } = await import("./session");
    const { updateUser } = await import("./identityService");
    const user = await seedUser(dataSource, { id: "user-1", tokenVersion: 0 });
    const update = await updateUser(
      user.id,
      { accessValidUntil: new Date(Date.now() - 60_000) } as Parameters<typeof updateUser>[1] & {
        accessValidUntil: Date;
      },
    );
    expect(update.ok).toBe(true);
    const persisted = await dataSource.getRepository(User).findOneByOrFail({ id: user.id });

    const token = await signCurrent("user-1", {
      email: user.email,
      role: user.role,
      tokenVersion: persisted.tokenVersion,
    });
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("rejects a token for a deleted account", async () => {
    const { verifySessionToken } = await import("./session");
    const token = await signCurrent("no-such-user", {
      email: "ghost@example.com",
      role: "SUPERADMIN",
      tokenVersion: 0,
    });
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("rejects an RS256 token whose kid is unknown", async () => {
    const { verifySessionToken } = await import("./session");
    await seedUser(dataSource, { id: "user-1", tokenVersion: 0 });
    const token = await signCurrent(
      "user-1",
      { email: "user1@example.com", role: "SUPERADMIN", tokenVersion: 0 },
      { kid: "unknown-kid" },
    );
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("accepts a token signed with the previous RSA kid during key rotation", async () => {
    const { verifySessionToken, issueSession } = await import("./session");
    const user = await seedUser(dataSource, { id: "user-1", tokenVersion: 0 });
    const { NextResponse } = await import("next/server");
    const response = await issueSession(NextResponse.json({}), {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      teamId: user.teamId ?? null,
      tokenVersion: 0,
    });
    const oldToken = response.cookies.get("foot_sso_session")?.value;
    if (!oldToken) throw new Error("Expected an issued SSO session token");

    process.env.SSO_JWT_PRIVATE_KEY_PREVIOUS = process.env.SSO_JWT_PRIVATE_KEY;
    process.env.SSO_JWT_KID_PREVIOUS = process.env.SSO_JWT_KID;
    process.env.SSO_JWT_PRIVATE_KEY = generateTestRsaPem();
    process.env.SSO_JWT_KID = "test-kid-rotated";
    resetJwtKeyCache();

    expect((await verifySessionToken(oldToken))?.id).toBe("user-1");
  });
});