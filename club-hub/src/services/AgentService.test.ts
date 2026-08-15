import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { FootballAgent } from "@/entities/Agent";

let dataSource: DataSource;

vi.mock("@/lib/database", () => ({ getDataSource: async () => dataSource }));

beforeEach(async () => { dataSource = await createTestDataSource(); });
afterEach(async () => { await dataSource.destroy(); });

describe("AgentService.isAgentActive", () => {
  it("returns false for an unknown agent", async () => {
    const { isAgentActive } = await import("./AgentService");
    expect(await isAgentActive(randomUUID())).toBe(false);
  });

  it("returns true only for an ACTIVE, non-expired agent", async () => {
    const { isAgentActive } = await import("./AgentService");
    const repo = dataSource.getRepository(FootballAgent);
    const active = await repo.save(repo.create({ federationId: "fed-1", fullName: "Agent Actif", status: "ACTIVE", contactEmail: "a@example.com", createdBy: "federation-admin" }));
    const pending = await repo.save(repo.create({ federationId: "fed-1", fullName: "Agent En Attente", status: "PENDING", contactEmail: "b@example.com", createdBy: "federation-admin" }));
    const expired = await repo.save(repo.create({ federationId: "fed-1", fullName: "Agent Expiré", status: "ACTIVE", validUntil: "2020-01-01", contactEmail: "c@example.com", createdBy: "federation-admin" }));
    expect(await isAgentActive(active.id)).toBe(true);
    expect(await isAgentActive(pending.id)).toBe(false);
    expect(await isAgentActive(expired.id)).toBe(false);
  });
});
