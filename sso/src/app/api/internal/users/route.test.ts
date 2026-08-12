import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { NextRequest } from "next/server";
import { createTestDataSource } from "@/test/testDataSource";

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

function buildRequest(body: unknown, apiKey?: string) {
  return new NextRequest("http://localhost/api/internal/users", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", ...(apiKey ? { "x-api-key": apiKey } : {}) },
  });
}

/** TS-53/TS-54 — POST /api/internal/users. */
describe("POST /api/internal/users", () => {
  it("rejects a request without a valid service API key", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      buildRequest({ name: "Amine", email: "a@example.com", password: "x", role: "ADMIN" }),
    );

    expect(response.status).toBe(401);
  });

  it("creates a user with a valid service API key", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      buildRequest(
        { name: "Amine", email: "a@example.com", password: "s3cret!", role: "ADMIN", teamId: "team-1" },
        "test-service-key",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.email).toBe("a@example.com");
    expect(body.isActive).toBe(true);
  });

  it("rejects a missing required field", async () => {
    const { POST } = await import("./route");

    const response = await POST(buildRequest({ name: "Amine" }, "test-service-key"));

    expect(response.status).toBe(400);
  });

  it("returns 409 for a duplicate email", async () => {
    const { POST } = await import("./route");
    await POST(
      buildRequest(
        { name: "Amine", email: "a@example.com", password: "x", role: "ADMIN", teamId: "team-1" },
        "test-service-key",
      ),
    );

    const response = await POST(
      buildRequest(
        { name: "Autre", email: "a@example.com", password: "y", role: "ADMIN", teamId: "team-1" },
        "test-service-key",
      ),
    );

    expect(response.status).toBe(409);
  });
});
