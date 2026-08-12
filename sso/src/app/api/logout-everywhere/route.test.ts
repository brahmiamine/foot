import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { NextRequest } from "next/server";
import { createTestDataSource } from "@/test/testDataSource";
import { seedUser } from "@/test/fixtures";

let dataSource: DataSource;

vi.mock("@/lib/db", () => ({
  getDataSource: async () => dataSource,
}));

// getCurrentSession() dépend de next/headers `cookies()`, indisponible hors
// d'un vrai contexte de requête App Router — on mock la session courante
// directement, comme le reste des tests de routes de ce dépôt mocke les
// dépendances qui touchent au runtime Next plutôt que le HTTP lui-même.
let currentSession: { id: string; email: string } | null = null;
vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return {
    ...actual,
    getCurrentSession: async () => currentSession,
  };
});

beforeEach(async () => {
  dataSource = await createTestDataSource();
  currentSession = null;
});

afterEach(async () => {
  await dataSource.destroy();
  vi.resetAllMocks();
});

function buildRequest(origin?: string) {
  return new NextRequest("http://localhost/api/logout-everywhere", {
    method: "POST",
    headers: origin ? { origin } : undefined,
  });
}

/** TS-34 — logout everywhere (tokenVersion bump). */
describe("POST /api/logout-everywhere", () => {
  it("rejects a request from an untrusted origin", async () => {
    const { POST } = await import("./route");

    const response = await POST(buildRequest("https://evil.example"));

    expect(response.status).toBe(403);
  });

  it("rejects an unauthenticated request", async () => {
    const { POST } = await import("./route");
    currentSession = null;

    const response = await POST(buildRequest("http://localhost:3004"));

    expect(response.status).toBe(401);
  });

  it("bumps tokenVersion and clears the session cookie on success", async () => {
    const { POST } = await import("./route");
    const { User } = await import("@/entities/User");
    const user = await seedUser(dataSource, { id: "user-1", tokenVersion: 4 });
    currentSession = { id: user.id, email: user.email };

    const response = await POST(buildRequest("http://localhost:3004"));

    expect(response.status).toBe(200);
    const reloaded = await dataSource.getRepository(User).findOne({ where: { id: "user-1" } });
    expect(reloaded?.tokenVersion).toBe(5);
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("foot_sso_session=;");
  });

  it("returns 404 when the session references a deleted account", async () => {
    const { POST } = await import("./route");
    currentSession = { id: "ghost", email: "ghost@example.com" };

    const response = await POST(buildRequest("http://localhost:3004"));

    expect(response.status).toBe(404);
  });
});
