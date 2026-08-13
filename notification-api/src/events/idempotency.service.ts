import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { NotificationEvent } from './entities/notification-event.entity';

export interface IdempotentResult {
  notificationIds: string[];
  deduplicated: boolean;
}

@Injectable()
export class IdempotencyService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(NotificationEvent)
    private readonly eventRepository: Repository<NotificationEvent>,
  ) {}

  /** Retourne l'événement déjà traité pour (application, eventId), ou null si c'est une première réception. */
  async findExisting(
    application: string,
    eventId: string,
  ): Promise<NotificationEvent | null> {
    return this.eventRepository.findOne({ where: { application, eventId } });
  }

  /**
   * Exécute `work` (création des notifications) et l'enregistrement de la
   * clé d'idempotence dans une seule transaction : soit les deux sont
   * persistés ensemble, soit rien ne l'est (aucun état intermédiaire visible
   * en cas de crash entre les deux étapes, §P0-017). La contrainte unique
   * `(application, eventId)` de `NotificationEvent` sert de verrou : si deux
   * requêtes concurrentes portent le même événement, la seconde à tenter
   * l'insertion reçoit une erreur de clé dupliquée, annule (rollback) le
   * travail qu'elle vient de faire et renvoie le résultat déjà enregistré
   * par la première — exactement un lot logique de notifications est créé.
   */
  async withIdempotency(
    application: string,
    eventId: string,
    type: string,
    work: (manager: EntityManager) => Promise<string[]>,
  ): Promise<IdempotentResult> {
    try {
      const notificationIds = await this.dataSource.transaction(
        async (manager) => {
          const ids = await work(manager);
          await manager.getRepository(NotificationEvent).insert({
            application,
            eventId,
            type,
            notificationIds: ids,
          });
          return ids;
        },
      );
      return { notificationIds, deduplicated: false };
    } catch (error) {
      if (!this.isDuplicateKeyError(error)) throw error;

      const existing = await this.findExisting(application, eventId);
      if (!existing) throw error;

      return { notificationIds: existing.notificationIds, deduplicated: true };
    }
  }

  private isDuplicateKeyError(error: unknown): boolean {
    const err = error as {
      code?: string;
      driverError?: { code?: string; errno?: number };
    };
    return (
      err?.code === 'ER_DUP_ENTRY' ||
      err?.driverError?.code === 'ER_DUP_ENTRY' ||
      err?.driverError?.errno === 1062
    );
  }
}
