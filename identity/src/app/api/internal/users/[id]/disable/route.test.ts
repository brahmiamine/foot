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

function buildRequest(apiKey = "test-service-key") {
  return new NextRequest("http://localhost/api/internal/users/user-1/disable", {
    method: "POST",
    headers: apiKey ? { "x-api-key": apiKey } : undefined,
  });
}

/** TS-54 — POST /api/internal/users/[id]/disable. */
describe("POST /api/internal/users/[id]/disable", () => {
  it("rejects without a valid service API key", async () => {
    const { POST } = await import("./route");
    const response = await POST(buildRequest(""), { params: Promise.resolve({ id: "user-1" }) });
    expect(response.status).toBe(401);
  });

  it("sets isActive to false", async () => {
    const { POST } = await import("./route");
    await seedUser(dataSource, { id: "user-1", isActive: true });

    const response = await POST(buildRequest(), { params: Promise.resolve({ id: "user-1" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.isActive).toBe(false);
  });

  it("returns 404 for an unknown user", async () => {
    const { POST } = await import("./route");
    const response = await POST(buildRequest(), { params: Promise.resolve({ id: "user-1" }) });
    expect(response.status).toBe(404);
  });
});
