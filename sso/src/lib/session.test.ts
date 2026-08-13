import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { generateKeyPairSync } from "crypto";
import { SignJWT } from "jose";
import { createTestDataSource } from "@/test/testDataSource";
import { seedUser } from "@/test/fixtures";
import { resetJwtKeyCache } from "@/lib/jwtKeys";

let dataSource: DataSource;

vi.mock("@/lib/db", () => ({
  getDataSource: async () => dataSource,
}));

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
  process.env.SSO_JWT_SECRET = "test-secret-at-least-32-bytes-long!!";
  process.env.SSO_JWT_PRIVATE_KEY = generateTestRsaPem();
  process.env.SSO_JWT_KID = "test-kid-current";
  delete process.env.SSO_JWT_PRIVATE_KEY_PREVIOUS;
  delete process.env.SSO_JWT_KID_PREVIOUS;
  resetJwtKeyCache();
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

  it("rejects an RS256 token whose kid is unknown", async () => {
    const { verifySessionToken } = await import("./session");
    await seedUser(dataSource, { id: "user-1", tokenVersion: 0 });
    const { privateKey } = await import("crypto").then((c) =>
      c.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
        publicKeyEncoding: { type: "spki", format: "pem" },
      })
    );
    const { importPKCS8 } = await import("jose");
    const key = await importPKCS8(privateKey, "RS256");
    const token = await new SignJWT({ email: "user1@example.com", name: "User", role: "SUPERADMIN", teamId: null, tokenVersion: 0 })
      .setProtectedHeader({ alg: "RS256", kid: "unknown-kid" })
      .setSubject("user-1")
      .setIssuer("foot-sso")
      .setIssuedAt()
      .setExpirationTime("12h")
      .sign(key);

    const result = await verifySessionToken(token);

    expect(result).toBeNull();
  });

  it("rotation: still accepts a token signed with the previous kid during the grace period", async () => {
    const { verifySessionToken, issueSession } = await import("./session");
    const user = await seedUser(dataSource, { id: "user-1", tokenVersion: 0 });
    const { NextResponse } = await import("next/server");

    // Émis avant rotation, avec l'ancienne clé courante.
    const response = await issueSession(NextResponse.json({}), {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      teamId: user.teamId,
      tokenVersion: 0,
    });
    const oldToken = response.cookies.get("foot_sso_session")?.value!;

    // Rotation : l'ancienne clé devient "previous", une nouvelle clé courante est générée.
    process.env.SSO_JWT_PRIVATE_KEY_PREVIOUS = process.env.SSO_JWT_PRIVATE_KEY;
    process.env.SSO_JWT_KID_PREVIOUS = process.env.SSO_JWT_KID;
    process.env.SSO_JWT_PRIVATE_KEY = generateTestRsaPem();
    process.env.SSO_JWT_KID = "test-kid-rotated";
    resetJwtKeyCache();

    const result = await verifySessionToken(oldToken);
    expect(result?.id).toBe("user-1");

    // Les nouveaux jetons sont bien signés avec la nouvelle clé courante.
    const response2 = await issueSession(NextResponse.json({}), {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      teamId: user.teamId,
      tokenVersion: 0,
    });
    const newToken = response2.cookies.get("foot_sso_session")?.value!;
    const result2 = await verifySessionToken(newToken);
    expect(result2?.id).toBe("user-1");
  });
});
