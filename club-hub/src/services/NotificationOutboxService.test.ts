import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { NotificationOutboxEvent } from "@/entities/NotificationOutboxEvent";

let dataSource: DataSource;

vi.mock("@/lib/database", () => ({
  getDataSource: async () => dataSource,
}));

const deliverNotification = vi.fn();
vi.mock("@/lib/notificationClient", () => ({
  deliverNotification: (...args: unknown[]) => deliverNotification(...args),
}));

beforeEach(async () => {
  dataSource = await createTestDataSource();
  deliverNotification.mockReset();
});

afterEach(async () => {
  await dataSource.destroy();
});

/** TS-25/TS-26 (Epic E07) — outbox transactionnel des notifications. */
describe("NotificationOutboxService", () => {
  describe("enqueue", () => {
    it("inserts a PENDING event within the given transaction", async () => {
      const { NotificationOutboxService } = await import("./NotificationOutboxService");
      const service = new NotificationOutboxService();

      await dataSource.transaction(async (manager) => {
        await service.enqueue(manager, {
          eventId: "news-published:1",
          type: "NEWS_PUBLISHED",
          teamId: "team-1",
          title: "Nouvelle actualité",
          body: "Titre",
        });
      });

      const events = await dataSource.getRepository(NotificationOutboxEvent).find();
      expect(events).toHaveLength(1);
      expect(events[0].status).toBe("PENDING");
      expect(events[0].eventId).toBe("news-published:1");
    });

    it("rolls back with the rest of the transaction on failure", async () => {
      const { NotificationOutboxService } = await import("./NotificationOutboxService");
      const service = new NotificationOutboxService();

      await expect(
        dataSource.transaction(async (manager) => {
          await service.enqueue(manager, {
            eventId: "news-published:1",
            type: "NEWS_PUBLISHED",
            teamId: "team-1",
            title: "x",
            body: "y",
          });
          throw new Error("business write failed");
        }),
      ).rejects.toThrow("business write failed");

      const events = await dataSource.getRepository(NotificationOutboxEvent).find();
      expect(events).toHaveLength(0);
    });
  });

  describe("processDue", () => {
    async function seedEvent(overrides: Partial<NotificationOutboxEvent> = {}) {
      const repo = dataSource.getRepository(NotificationOutboxEvent);
      return repo.save(
        repo.create({
          eventId: `event-${Math.random()}`,
          payload: { type: "NEWS_PUBLISHED", title: "t", body: "b" },
          status: "PENDING",
          attempts: 0,
          nextRetryAt: null,
          processedAt: null,
          lastError: null,
          ...overrides,
        }),
      );
    }

    it("delivers a due event and marks it PROCESSED", async () => {
      const { NotificationOutboxService } = await import("./NotificationOutboxService");
      deliverNotification.mockResolvedValue(undefined);
      await seedEvent();

      const result = await new NotificationOutboxService().processDue();

      expect(result).toEqual({ processed: 1, failed: 0, rescheduled: 0 });
      const events = await dataSource.getRepository(NotificationOutboxEvent).find();
      expect(events[0].status).toBe("PROCESSED");
      expect(events[0].processedAt).toBeInstanceOf(Date);
    });

    it("skips an event whose nextRetryAt is in the future", async () => {
      const { NotificationOutboxService } = await import("./NotificationOutboxService");
      await seedEvent({ nextRetryAt: new Date(Date.now() + 60_000) });

      const result = await new NotificationOutboxService().processDue();

      expect(result).toEqual({ processed: 0, failed: 0, rescheduled: 0 });
      expect(deliverNotification).not.toHaveBeenCalled();
    });

    it("processes an event whose nextRetryAt has already passed", async () => {
      const { NotificationOutboxService } = await import("./NotificationOutboxService");
      deliverNotification.mockResolvedValue(undefined);
      await seedEvent({ nextRetryAt: new Date(Date.now() - 1000) });

      const result = await new NotificationOutboxService().processDue();

      expect(result.processed).toBe(1);
    });

    it("reschedules on failure following the retry schedule (first failure -> +1min)", async () => {
      const { NotificationOutboxService } = await import("./NotificationOutboxService");
      deliverNotification.mockRejectedValue(new Error("network down"));
      await seedEvent();

      const before = Date.now();
      const result = await new NotificationOutboxService().processDue();

      expect(result).toEqual({ processed: 0, failed: 0, rescheduled: 1 });
      const events = await dataSource.getRepository(NotificationOutboxEvent).find();
      expect(events[0].status).toBe("PENDING");
      expect(events[0].attempts).toBe(1);
      expect(events[0].lastError).toBe("network down");
      expect(events[0].nextRetryAt!.getTime()).toBeGreaterThan(before);
    });

    it("marks FAILED (DLQ) once the retry schedule is exhausted", async () => {
      const { NotificationOutboxService } = await import("./NotificationOutboxService");
      deliverNotification.mockRejectedValue(new Error("still down"));
      await seedEvent({ attempts: 5 });

      const result = await new NotificationOutboxService().processDue();

      expect(result).toEqual({ processed: 0, failed: 1, rescheduled: 0 });
      const events = await dataSource.getRepository(NotificationOutboxEvent).find();
      expect(events[0].status).toBe("FAILED");
      expect(events[0].attempts).toBe(6);
    });

    it("never re-processes an already PROCESSED or FAILED event", async () => {
      const { NotificationOutboxService } = await import("./NotificationOutboxService");
      await seedEvent({ status: "PROCESSED" });
      await seedEvent({ status: "FAILED" });

      const result = await new NotificationOutboxService().processDue();

      expect(result).toEqual({ processed: 0, failed: 0, rescheduled: 0 });
      expect(deliverNotification).not.toHaveBeenCalled();
    });
  });

  describe("getStats", () => {
    async function seedEvent(overrides: Partial<NotificationOutboxEvent> = {}) {
      const repo = dataSource.getRepository(NotificationOutboxEvent);
      return repo.save(
        repo.create({
          eventId: `event-${Math.random()}`,
          payload: { type: "NEWS_PUBLISHED", title: "t", body: "b" },
          status: "PENDING",
          attempts: 0,
          nextRetryAt: null,
          processedAt: null,
          lastError: null,
          ...overrides,
        }),
      );
    }

    it("counts events by status (TASK-P0-006)", async () => {
      const { NotificationOutboxService } = await import("./NotificationOutboxService");
      await seedEvent({ status: "PENDING" });
      await seedEvent({ status: "PENDING" });
      await seedEvent({ status: "PROCESSED" });
      await seedEvent({ status: "FAILED" });

      const stats = await new NotificationOutboxService().getStats();

      expect(stats).toEqual({ pending: 2, processed: 1, dlq: 1 });
    });
  });
});
