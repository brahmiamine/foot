import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { generateKeyPairSync } from "crypto";
import { importPKCS8, SignJWT } from "jose";
import { NextRequest } from "next/server";
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

function buildRequest(authorization?: string) {
  return new NextRequest("http://localhost/api/session/introspect", {
    headers: authorization ? { authorization } : undefined,
  });
}

async function signToken(userId: string, tokenVersion: number) {
  const key = await importPKCS8(process.env.SSO_JWT_PRIVATE_KEY!, "RS256");
  return new SignJWT({
    email: "user@example.com",
    name: "User",
    role: "SUPERADMIN",
    teamId: null,
    tokenVersion,
  })
    .setProtectedHeader({ alg: "RS256", kid: process.env.SSO_JWT_KID })
    .setSubject(userId)
    .setIssuer("foot-sso")
    .setAudience("foot-platform")
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(key);
}

/** TS-34 — introspection, consommée par les 6 apps clientes pour la révocation (TS-29). */
describe("GET /api/session/introspect", () => {
  it("requires an Authorization: Bearer header", async () => {
    const { GET } = await import("./route");

    const response = await GET(buildRequest());

    expect(response.status).toBe(400);
  });

  it("reports active: false for a token with a stale tokenVersion", async () => {
    const { GET } = await import("./route");
    await seedUser(dataSource, { id: "user-1", tokenVersion: 3 });
    const token = await signToken("user-1", 1);

    const response = await GET(buildRequest(`Bearer ${token}`));
    const body = await response.json();

    expect(body).toEqual({ active: false });
  });

  it("reports active: false for a forged/garbage token, without a 500", async () => {
    const { GET } = await import("./route");

    const response = await GET(buildRequest("Bearer not-a-real-jwt"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ active: false });
  });

  it("reports active: true with the session payload for a valid, current token", async () => {
    const { GET } = await import("./route");
    await seedUser(dataSource, { id: "user-1", tokenVersion: 0, email: "user@example.com" });
    const token = await signToken("user-1", 0);

    const response = await GET(buildRequest(`Bearer ${token}`));
    const body = await response.json();

    expect(body.active).toBe(true);
    expect(body.user.id).toBe("user-1");
  });
});
