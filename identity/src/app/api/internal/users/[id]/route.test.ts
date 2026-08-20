import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { NextRequest } from "next/server";
import { createTestDataSource } from "@/test/testDataSource";
import { seedUser } from "@/test/fixtures";

let dataSource: DataSource;

vi.mock("@/lib/db", () => ({
  getDataSource: async () => dataSource,
}));

beforeEach(async () => {
  dataSource = await createTestDataSource();
  process.env.SSO_SERVICE_API_KEY = "test-service-key";
});

afterEach(async () => {
  await dataSource.destroy();
});

function buildRequest(method: string, body?: unknown, apiKey = "test-service-key") {
  return new NextRequest("http://localhost/api/internal/users/user-1", {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    headers: { "content-type": "application/json", ...(apiKey ? { "x-api-key": apiKey } : {}) },
  });
}

describe("GET /api/internal/users/[id]", () => {
  it("rejects without a valid service API key", async () => {
    const { GET } = await import("./route");
    const response = await GET(buildRequest("GET", undefined, ""), { params: Promise.resolve({ id: "user-1" }) });
    expect(response.status).toBe(401);
  });

  it("returns 404 for an unknown user", async () => {
    const { GET } = await import("./route");
    const response = await GET(buildRequest("GET"), { params: Promise.resolve({ id: "user-1" }) });
    expect(response.status).toBe(404);
  });

  it("returns the user", async () => {
    const { GET } = await import("./route");
    await seedUser(dataSource, { id: "user-1", email: "user1@example.com" });

    const response = await GET(buildRequest("GET"), { params: Promise.resolve({ id: "user-1" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.email).toBe("user1@example.com");
  });
});

describe("PATCH /api/internal/users/[id]", () => {
  it("updates isActive/role/password", async () => {
    const { PATCH } = await import("./route");
    await seedUser(dataSource, { id: "user-1", isActive: true, role: "OBSERVATEUR" });

    const response = await PATCH(buildRequest("PATCH", { isActive: false, role: "ADMIN" }), {
      params: Promise.resolve({ id: "user-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.isActive).toBe(false);
    expect(body.role).toBe("ADMIN");
  });

  it("updates a bounded temporary access window", async () => {
    const { PATCH } = await import("./route");
    await seedUser(dataSource, { id: "user-1", tokenVersion: 4 });

    const response = await PATCH(buildRequest("PATCH", {
      accessValidFrom: "2026-08-20T08:00:00.000Z",
      accessValidUntil: "2026-08-20T18:00:00.000Z",
    }), { params: Promise.resolve({ id: "user-1" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.accessValidFrom).toBe("2026-08-20T08:00:00.000Z");
    expect(body.accessValidUntil).toBe("2026-08-20T18:00:00.000Z");
  });

  it("rejects an inverted temporary access window", async () => {
    const { PATCH } = await import("./route");
    await seedUser(dataSource, { id: "user-1" });

    const response = await PATCH(buildRequest("PATCH", {
      accessValidFrom: "2026-08-20T18:00:00.000Z",
      accessValidUntil: "2026-08-20T08:00:00.000Z",
    }), { params: Promise.resolve({ id: "user-1" }) });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_access_window" });
  });

  it("rejects timezone-ambiguous temporary access instants", async () => {
    const { PATCH } = await import("./route");
    await seedUser(dataSource, { id: "user-1" });

    const response = await PATCH(buildRequest("PATCH", {
      accessValidUntil: "2026-08-20T18:00:00",
    }), { params: Promise.resolve({ id: "user-1" }) });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_access_window" });
  });

  it("rejects an empty body", async () => {
    const { PATCH } = await import("./route");
    await seedUser(dataSource, { id: "user-1" });

    const response = await PATCH(buildRequest("PATCH", {}), { params: Promise.resolve({ id: "user-1" }) });

    expect(response.status).toBe(400);
  });

  it("returns 404 for an unknown user", async () => {
    const { PATCH } = await import("./route");
    const response = await PATCH(buildRequest("PATCH", { isActive: false }), {
      params: Promise.resolve({ id: "user-1" }),
    });
    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/internal/users/[id]", () => {
  it("deletes the user", async () => {
    const { DELETE } = await import("./route");
    await seedUser(dataSource, { id: "user-1" });

    const response = await DELETE(buildRequest("DELETE"), { params: Promise.resolve({ id: "user-1" }) });

    expect(response.status).toBe(200);
  });

  it("returns 404 for an unknown user", async () => {
    const { DELETE } = await import("./route");
    const response = await DELETE(buildRequest("DELETE"), { params: Promise.resolve({ id: "user-1" }) });
    expect(response.status).toBe(404);
  });
});