import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { ProcessedWebhookEvent } from "@/entities/ProcessedWebhookEvent";

let dataSource: DataSource;

vi.mock("@/lib/database", () => ({
  getDataSource: async () => dataSource,
}));

beforeEach(async () => {
  dataSource = await createTestDataSource();
});

afterEach(async () => {
  await dataSource.destroy();
});

/**
 * TASK-P0-005 : le même eventId de webhook payment-api peut arriver
 * plusieurs fois (retries) — claimWebhookEvent() ne doit laisser traiter le
 * premier appel qu'une seule fois.
 */
describe("claimWebhookEvent", () => {
  it("returns true and persists the event on first claim", async () => {
    const { claimWebhookEvent } = await import("./webhookIdempotency");

    const claimed = await claimWebhookEvent("event-1", "payment-1");

    expect(claimed).toBe(true);
    const stored = await dataSource.getRepository(ProcessedWebhookEvent).findOne({ where: { eventId: "event-1" } });
    expect(stored?.paymentId).toBe("payment-1");
  });

  it("returns false on a second claim for the same eventId", async () => {
    const { claimWebhookEvent } = await import("./webhookIdempotency");

    const first = await claimWebhookEvent("event-1", "payment-1");
    const second = await claimWebhookEvent("event-1", "payment-1");

    expect(first).toBe(true);
    expect(second).toBe(false);
    const count = await dataSource.getRepository(ProcessedWebhookEvent).count({ where: { eventId: "event-1" } });
    expect(count).toBe(1);
  });

  it("treats concurrent claims for the same eventId as exactly one winner", async () => {
    const { claimWebhookEvent } = await import("./webhookIdempotency");

    const results = await Promise.all([
      claimWebhookEvent("event-race", "payment-1"),
      claimWebhookEvent("event-race", "payment-1"),
      claimWebhookEvent("event-race", "payment-1"),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("allows different eventIds independently", async () => {
    const { claimWebhookEvent } = await import("./webhookIdempotency");

    expect(await claimWebhookEvent("event-1", "payment-1")).toBe(true);
    expect(await claimWebhookEvent("event-2", "payment-1")).toBe(true);
  });
});
