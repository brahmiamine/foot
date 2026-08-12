import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { NextRequest } from "next/server";
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

function buildRequest(authorization?: string) {
  return new NextRequest("http://localhost/api/session/introspect", {
    headers: authorization ? { authorization } : undefined,
  });
}

async function signToken(userId: string, tokenVersion: number) {
  return new SignJWT({ email: "user@example.com", name: "User", role: "SUPERADMIN", teamId: null, tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer("foot-sso")
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(new TextEncoder().encode(process.env.SSO_JWT_SECRET));
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
