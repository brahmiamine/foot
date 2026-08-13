import { EntityManager } from 'typeorm';
import { NotificationEvent } from './entities/notification-event.entity';
import { IdempotencyService } from './idempotency.service';

/**
 * Simule une base MySQL minimale pour `notification_events` : une table en
 * mémoire avec une contrainte unique (application, eventId) appliquée à
 * l'insertion, et un `transaction()` qui ne rend les écritures visibles
 * qu'au commit (ou les jette au rollback), pour reproduire le comportement
 * réel dont dépend `IdempotencyService.withIdempotency`.
 */
class FakeEventsTable {
  rows: NotificationEvent[] = [];

  findOne(application: string, eventId: string): NotificationEvent | null {
    return (
      this.rows.find(
        (r) => r.application === application && r.eventId === eventId,
      ) ?? null
    );
  }

  /** Lève une erreur "ER_DUP_ENTRY" si la clé existe déjà, comme MySQL. */
  insert(row: Omit<NotificationEvent, 'id' | 'createdAt'>): void {
    if (this.findOne(row.application, row.eventId)) {
      const error = new Error('Duplicate entry') as Error & {
        driverError: { errno: number; code: string };
      };
      error.driverError = { errno: 1062, code: 'ER_DUP_ENTRY' };
      throw error;
    }
    this.rows.push({
      ...row,
      id: `evt-${this.rows.length + 1}`,
      createdAt: new Date(),
    });
  }
}

function buildService(table: FakeEventsTable): IdempotencyService {
  const eventRepository = {
    findOne: jest.fn(
      (options: { where: { application: string; eventId: string } }) =>
        Promise.resolve(
          table.findOne(options.where.application, options.where.eventId),
        ),
    ),
  };

  const managerFor = (): EntityManager =>
    ({
      getRepository: () => ({
        insert: jest.fn((row: Omit<NotificationEvent, 'id' | 'createdAt'>) => {
          table.insert(row);
          return Promise.resolve({});
        }),
      }),
    }) as unknown as EntityManager;

  const dataSource = {
    // Une "transaction" par appel : les écritures ne sont ajoutées à `table`
    // que si le callback ne jette pas ; sinon rien n'est persisté (rollback).
    transaction: jest.fn(
      async <T>(work: (manager: EntityManager) => Promise<T>) =>
        work(managerFor()),
    ),
  };

  return new IdempotencyService(dataSource as never, eventRepository as never);
}

describe('IdempotencyService', () => {
  it('persists notifications and the idempotency key together on first receipt', async () => {
    const table = new FakeEventsTable();
    const service = buildService(table);

    const result = await service.withIdempotency(
      'payment-api',
      'payment-123-succeeded',
      'PAYMENT_SUCCEEDED',
      () => Promise.resolve(['notif-1', 'notif-2']),
    );

    expect(result).toEqual({
      notificationIds: ['notif-1', 'notif-2'],
      deduplicated: false,
    });
    expect(table.rows).toHaveLength(1);
  });

  it('returns the already-recorded result on a replayed event instead of redoing the work', async () => {
    const table = new FakeEventsTable();
    const service = buildService(table);
    const work = jest.fn(() => Promise.resolve(['notif-1']));

    await service.withIdempotency(
      'payment-api',
      'payment-123-succeeded',
      'PAYMENT_SUCCEEDED',
      work,
    );

    const replay = await service.withIdempotency(
      'payment-api',
      'payment-123-succeeded',
      'PAYMENT_SUCCEEDED',
      work,
    );

    expect(replay).toEqual({
      notificationIds: ['notif-1'],
      deduplicated: true,
    });
    // Le travail (création de notifications) est bien retenté par l'appelant
    // (webhook rejoué) mais son résultat est ignoré au profit de celui déjà
    // enregistré : aucune deuxième ligne n'est écrite.
    expect(table.rows).toHaveLength(1);
  });

  it('treats the same eventId from different applications as distinct events', async () => {
    const table = new FakeEventsTable();
    const service = buildService(table);

    await service.withIdempotency('payment-api', 'evt-1', 'X', () =>
      Promise.resolve(['notif-1']),
    );
    const result = await service.withIdempotency(
      'marketplace-api',
      'evt-1',
      'X',
      () => Promise.resolve(['notif-2']),
    );

    expect(result.deduplicated).toBe(false);
    expect(table.rows).toHaveLength(2);
  });

  it('rolls back the notifications of the losing concurrent request and returns exactly one logical batch', async () => {
    const table = new FakeEventsTable();
    const service = buildService(table);

    // Deux requêtes concurrentes pour le même eventId : la première à
    // atteindre l'insertion "gagne", la seconde doit voir son travail
    // annulé et récupérer le résultat de la gagnante.
    const first = service.withIdempotency('payment-api', 'evt-race', 'X', () =>
      Promise.resolve(['from-first']),
    );
    const second = service.withIdempotency('payment-api', 'evt-race', 'X', () =>
      Promise.resolve(['from-second']),
    );

    const [firstResult, secondResult] = await Promise.all([first, second]);

    const results = [firstResult, secondResult];
    const winner = results.find((r) => !r.deduplicated)!;
    const loser = results.find((r) => r.deduplicated)!;

    expect(winner).toBeDefined();
    expect(loser).toBeDefined();
    expect(loser.notificationIds).toEqual(winner.notificationIds);
    expect(table.rows).toHaveLength(1);
  });

  it('propagates an error that is not a duplicate-key conflict instead of swallowing it', async () => {
    const table = new FakeEventsTable();
    const service = buildService(table);

    await expect(
      service.withIdempotency('payment-api', 'evt-1', 'X', () =>
        Promise.reject(new Error('recipient resolution failed')),
      ),
    ).rejects.toThrow('recipient resolution failed');
    expect(table.rows).toHaveLength(0);
  });
});
