import { randomUUID } from "crypto";
import type { EntityManager } from "typeorm";
import { getDataSource } from "@/lib/database";
import { NotificationOutboxEvent } from "@/entities/NotificationOutboxEvent";
import type { NotifyPayload } from "@/lib/notificationClient";
import { deliverNotification } from "@/lib/notificationClient";
import { computeNextRetryAt } from "@/lib/notificationOutboxRetrySchedule";

const MAX_BATCH_SIZE = 20;

export interface ProcessOutboxResult {
  processed: number;
  failed: number;
  rescheduled: number;
}

export interface OutboxStats {
  pending: number;
  processed: number;
  /** Events that exhausted the retry schedule (dead-letter queue). */
  dlq: number;
}

/**
 * TS-25/TS-26 (avancement.md, Epic E07) : outbox transactionnel pour les
 * notifications déclenchées par club-hub — voir
 * entities/NotificationOutboxEvent.ts.
 */
export class NotificationOutboxService {
  /**
   * Insère l'événement dans LA MÊME transaction que l'écriture métier.
   * `eventId` est une clé d'idempotence métier : rejouer le même événement
   * (par exemple une republication News après revalidation) ne doit jamais
   * faire échouer la transaction sur l'index unique de l'outbox.
   */
  async enqueue(manager: EntityManager, payload: NotifyPayload): Promise<void> {
    const eventId = payload.eventId ?? randomUUID();
    await manager
      .createQueryBuilder()
      .insert()
      .into(NotificationOutboxEvent)
      .values({
        eventId,
        payload: { ...payload, eventId },
        status: "PENDING",
        attempts: 0,
        nextRetryAt: null,
        processedAt: null,
        lastError: null,
      })
      .orIgnore()
      .execute();
  }

  /**
   * Traite un lot d'événements dus (PENDING, `nextRetryAt` NULL ou passé).
   * Poll-once : conçu pour être invoqué périodiquement par un
   * ordonnanceur externe (voir app/api/internal/outbox/process/route.ts),
   * pas une boucle persistante — club-hub n'a pas de process
   * long-running comme les API NestJS de ce dépôt (payments,
   * OutboxWorkerService).
   */
  async processDue(): Promise<ProcessOutboxResult> {
    const dataSource = await getDataSource();
    const repository = dataSource.getRepository(NotificationOutboxEvent);
    const now = new Date();

    const due = await repository
      .createQueryBuilder("event")
      .where("event.status = :status", { status: "PENDING" })
      .andWhere("(event.nextRetryAt IS NULL OR event.nextRetryAt <= :now)", { now })
      .orderBy("event.createdAt", "ASC")
      .take(MAX_BATCH_SIZE)
      .getMany();

    const result: ProcessOutboxResult = { processed: 0, failed: 0, rescheduled: 0 };

    for (const event of due) {
      try {
        await deliverNotification(event.payload);
        event.status = "PROCESSED";
        event.processedAt = new Date();
        event.lastError = null;
        await repository.save(event);
        result.processed += 1;
      } catch (error) {
        event.attempts += 1;
        event.lastError = error instanceof Error ? error.message : String(error);
        const nextRetryAt = computeNextRetryAt(event.attempts);
        if (nextRetryAt) {
          event.nextRetryAt = nextRetryAt;
          result.rescheduled += 1;
        } else {
          event.status = "FAILED";
          result.failed += 1;
        }
        await repository.save(event);
      }
    }

    return result;
  }

  /**
   * TASK-P0-006 (todo.md): backs GET /api/internal/outbox/status so ops
   * can tell a stuck ordonnanceur (pending piling up because
   * /process isn't being called) from notifications outages (dlq
   * piling up) without querying the DB directly. Same shape as
   * payments's OutboxService.getStats() (payments/src/outbox).
   */
  async getStats(): Promise<OutboxStats> {
    const dataSource = await getDataSource();
    const repository = dataSource.getRepository(NotificationOutboxEvent);
    const [pending, processed, dlq] = await Promise.all([
      repository.count({ where: { status: "PENDING" } }),
      repository.count({ where: { status: "PROCESSED" } }),
      repository.count({ where: { status: "FAILED" } }),
    ]);
    return { pending, processed, dlq };
  }
}
