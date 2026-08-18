import { EntityManager } from 'typeorm';
import { NotificationChannelType } from '../common/enums/channel.enum';
import { DigestMode } from '../common/enums/digest-mode.enum';
import { Notification } from '../notifications/entities/notification.entity';
import { DigestQueueEntry } from './entities/digest-queue-entry.entity';
import { DigestService } from './digest.service';

/**
 * Simule les tables `notification_digest_queue`/`notifications` avec une
 * "transaction" qui ne rend les écritures visibles qu'au commit, comme
 * `idempotency.service.spec.ts` le fait pour `notification_events` — le but
 * est de reproduire fidèlement la revendication atomique (`UPDATE ... WHERE
 * flushed = false`) sur laquelle repose l'idempotence de NOTIF-003.
 */
class FakeDigestQueueTable {
  rows: DigestQueueEntry[] = [];

  claim(ids: string[]): number {
    let affected = 0;
    for (const row of this.rows) {
      if (ids.includes(row.id) && !row.flushed) {
        row.flushed = true;
        affected += 1;
      }
    }
    return affected;
  }
}

function buildService(
  queue: FakeDigestQueueTable,
  notifications: Notification[],
): { service: DigestService; enqueueCalls: unknown[]; skipCalls: unknown[] } {
  const enqueueCalls: unknown[] = [];
  const skipCalls: unknown[] = [];
  let seq = 0;

  const repository = {
    find: jest.fn(
      (options: {
        where: {
          mode: DigestMode;
          flushed: boolean;
          windowStart: { value: Date };
        };
      }) =>
        Promise.resolve(
          queue.rows.filter(
            (row) =>
              row.mode === options.where.mode &&
              row.flushed === options.where.flushed &&
              row.windowStart.getTime() <=
                options.where.windowStart.value.getTime(),
          ),
        ),
    ),
    create: jest.fn((data: Partial<DigestQueueEntry>) => ({
      id: `entry-${++seq}`,
      ...data,
    })),
    save: jest.fn((row: DigestQueueEntry) => {
      queue.rows.push(row);
      return Promise.resolve(row);
    }),
  };

  const managerFor = (): EntityManager =>
    ({
      getRepository: (entity: unknown) => {
        if (entity === DigestQueueEntry) {
          return {
            createQueryBuilder: () => {
              let claimedIds: string[] = [];
              const builder = {
                update: () => builder,
                set: () => builder,
                where: (_sql: string, params: { ids: string[] }) => {
                  claimedIds = params.ids;
                  return builder;
                },
                andWhere: () => builder,
                execute: () =>
                  Promise.resolve({ affected: queue.claim(claimedIds) }),
              };
              return builder;
            },
          };
        }
        if (entity === Notification) {
          return {
            find: (options: { where: { id: { value: string[] } } }) =>
              Promise.resolve(
                notifications.filter((n) =>
                  options.where.id.value.includes(n.id),
                ),
              ),
            create: (data: Partial<Notification>) =>
              ({ id: `digest-${++seq}`, ...data }) as Notification,
            save: (row: Notification) => Promise.resolve(row),
          };
        }
        throw new Error('Unexpected repository requested in test');
      },
    }) as unknown as EntityManager;

  const dataSource = {
    transaction: jest.fn(
      async <T>(work: (manager: EntityManager) => Promise<T>) =>
        work(managerFor()),
    ),
  };

  const deliveries = {
    createPending: jest.fn(() => Promise.resolve({ id: `delivery-${++seq}` })),
    markSkipped: jest.fn((...args: unknown[]) => {
      skipCalls.push(args);
      return Promise.resolve();
    }),
  };

  const dispatchProducer = {
    enqueue: jest.fn((...args: unknown[]) => {
      enqueueCalls.push(args);
      return Promise.resolve();
    }),
  };

  const service = new DigestService(
    dataSource as never,
    repository as never,
    deliveries as never,
    dispatchProducer as never,
  );
  return { service, enqueueCalls, skipCalls };
}

describe('DigestService', () => {
  it('enqueues a notification for later aggregation and marks its delivery skipped', async () => {
    const queue = new FakeDigestQueueTable();
    const { service, skipCalls } = buildService(queue, []);

    await service.enqueue(
      'user-1',
      NotificationChannelType.EMAIL,
      DigestMode.HOURLY,
      'notif-1',
      'delivery-1',
    );

    expect(queue.rows).toHaveLength(1);
    expect(queue.rows[0]).toMatchObject({ userId: 'user-1', flushed: false });
    expect(skipCalls).toHaveLength(1);
  });

  it('flushes a closed window exactly once even if flushDue is invoked twice concurrently', async () => {
    const queue = new FakeDigestQueueTable();
    const notifications = [
      { id: 'notif-1', title: 'A' } as Notification,
      { id: 'notif-2', title: 'B' } as Notification,
    ];
    const { service, enqueueCalls } = buildService(queue, notifications);

    const windowStart = new Date('2026-01-15T10:00:00.000Z');
    queue.rows.push(
      {
        id: 'entry-1',
        userId: 'user-1',
        channel: NotificationChannelType.EMAIL,
        mode: DigestMode.HOURLY,
        windowStart,
        notificationId: 'notif-1',
        deliveryId: 'delivery-1',
        flushed: false,
        createdAt: new Date(),
      },
      {
        id: 'entry-2',
        userId: 'user-1',
        channel: NotificationChannelType.EMAIL,
        mode: DigestMode.HOURLY,
        windowStart,
        notificationId: 'notif-2',
        deliveryId: 'delivery-2',
        flushed: false,
        createdAt: new Date(),
      },
    );

    const now = new Date('2026-01-15T11:05:00.000Z');
    const [firstCount, secondCount] = await Promise.all([
      service.flushDue(DigestMode.HOURLY, now),
      service.flushDue(DigestMode.HOURLY, now),
    ]);

    expect(firstCount + secondCount).toBe(1);
    expect(enqueueCalls).toHaveLength(1);
    expect(queue.rows.every((row) => row.flushed)).toBe(true);
  });

  it('does not flush a window that has not fully closed yet', async () => {
    const queue = new FakeDigestQueueTable();
    const { service, enqueueCalls } = buildService(queue, []);

    queue.rows.push({
      id: 'entry-1',
      userId: 'user-1',
      channel: NotificationChannelType.EMAIL,
      mode: DigestMode.HOURLY,
      windowStart: new Date('2026-01-15T10:30:00.000Z'),
      notificationId: 'notif-1',
      deliveryId: 'delivery-1',
      flushed: false,
      createdAt: new Date(),
    });

    const count = await service.flushDue(
      DigestMode.HOURLY,
      new Date('2026-01-15T10:45:00.000Z'),
    );

    expect(count).toBe(0);
    expect(enqueueCalls).toHaveLength(0);
  });
});
