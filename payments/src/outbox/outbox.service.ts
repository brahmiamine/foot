import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { OutboxEvent, OutboxEventStatus } from './entities/outbox-event.entity';

export interface EnqueueOutboxEventParams {
  eventType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
}

export interface OutboxStats {
  pending: number;
  processed: number;
  /** Events that exhausted RETRY_SCHEDULE_MINUTES (dead-letter queue). */
  dlq: number;
}

/**
 * Écriture de l'outbox (TS-12) — prend délibérément un `EntityManager` en
 * paramètre plutôt que d'injecter son propre repository : l'appelant
 * (PaymentService) doit passer le manager de SA transaction pour que
 * l'insertion commit/rollback avec la transition de statut du paiement,
 * jamais indépendamment.
 */
@Injectable()
export class OutboxService {
  constructor(
    @InjectRepository(OutboxEvent)
    private readonly repository: Repository<OutboxEvent>,
  ) {}

  async enqueue(
    manager: EntityManager,
    params: EnqueueOutboxEventParams,
  ): Promise<void> {
    await manager.getRepository(OutboxEvent).insert({
      eventType: params.eventType,
      aggregateId: params.aggregateId,
      // TypeORM's DeepPartial mapped type can't resolve a `json` column
      // typed as Record<string, unknown> — this is a plain opaque payload,
      // never partially updated field-by-field, so the cast is safe.
      payload: params.payload,
      status: OutboxEventStatus.PENDING,
    } as QueryDeepPartialEntity<OutboxEvent>);
  }

  /**
   * TASK-P0-006 (todo.md): backs `GET /health/outbox` so ops can see
   * whether events are piling up (worker stuck/down) or dead-lettering
   * (provider/webhook endpoint down past the full retry schedule) without
   * querying the DB directly.
   */
  async getStats(): Promise<OutboxStats> {
    const [pending, processed, dlq] = await Promise.all([
      this.repository.count({ where: { status: OutboxEventStatus.PENDING } }),
      this.repository.count({
        where: { status: OutboxEventStatus.PROCESSED },
      }),
      this.repository.count({ where: { status: OutboxEventStatus.FAILED } }),
    ]);
    return { pending, processed, dlq };
  }
}
