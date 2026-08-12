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

/**
 * TS-25/TS-26 (avancement.md, Epic E07) : outbox transactionnel pour les
 * notifications déclenchées par teamManager — voir
 * entities/NotificationOutboxEvent.ts.
 */
export class NotificationOutboxService {
  /**
   * Insère l'événement dans LA MÊME transaction que l'écriture métier
   * appelante — `manager` doit provenir de `dataSource.transaction(...)`,
   * jamais d'un repository obtenu indépendamment (voir
   * app/admin/news/actions.ts pour un exemple d'appel).
   */
  async enqueue(manager: EntityManager, payload: NotifyPayload): Promise<void> {
    const eventId = payload.eventId ?? randomUUID();
    const repository = manager.getRepository(NotificationOutboxEvent);
    await repository.save(
      repository.create({
        eventId,
        payload: { ...payload, eventId },
        status: "PENDING",
        attempts: 0,
        nextRetryAt: null,
        processedAt: null,
        lastError: null,
      })
    );
  }

  /**
   * Traite un lot d'événements dus (PENDING, `nextRetryAt` NULL ou passé).
   * Poll-once : conçu pour être invoqué périodiquement par un
   * ordonnanceur externe (voir app/api/internal/outbox/process/route.ts),
   * pas une boucle persistante — teamManager n'a pas de process
   * long-running comme les API NestJS de ce dépôt (payment-api,
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
}
