import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { OutboxEvent, OutboxEventStatus } from './entities/outbox-event.entity';

export interface EnqueueOutboxEventParams {
  eventType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
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
}
