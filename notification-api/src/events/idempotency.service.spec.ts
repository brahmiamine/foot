import { NotificationEvent } from './entities/notification-event.entity';
import { IdempotencyService } from './idempotency.service';

describe('IdempotencyService', () => {
  let events: NotificationEvent[];
  let service: IdempotencyService;

  beforeEach(() => {
    events = [];
    const repository = {
      findOne: jest.fn(
        (options: { where: { application: string; eventId: string } }) =>
          Promise.resolve(
            events.find(
              (event) =>
                event.application === options.where.application &&
                event.eventId === options.where.eventId,
            ) ?? null,
          ),
      ),
      create: jest.fn(
        (data: Partial<NotificationEvent>) =>
          ({ ...data }) as NotificationEvent,
      ),
      save: jest.fn((event: NotificationEvent) => {
        events.push(event);
        return Promise.resolve(event);
      }),
    };
    service = new IdempotencyService(repository as never);
  });

  it('returns null for a never-seen (application, eventId) pair', async () => {
    expect(
      await service.findExisting('payment-api', 'payment-123-succeeded'),
    ).toBeNull();
  });

  it('returns the recorded event on a second lookup for the same key (replayed webhook)', async () => {
    await service.record(
      'payment-api',
      'payment-123-succeeded',
      'PAYMENT_SUCCEEDED',
      ['notif-1'],
    );

    const found = await service.findExisting(
      'payment-api',
      'payment-123-succeeded',
    );

    expect(found).not.toBeNull();
    expect(found?.notificationIds).toEqual(['notif-1']);
  });

  it('treats the same eventId from different applications as distinct events', async () => {
    await service.record('payment-api', 'evt-1', 'PAYMENT_SUCCEEDED', [
      'notif-1',
    ]);

    expect(await service.findExisting('marketplace-api', 'evt-1')).toBeNull();
  });
});
