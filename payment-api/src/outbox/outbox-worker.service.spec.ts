import { Repository } from 'typeorm';
import { OutboxWorkerService } from './outbox-worker.service';
import { OutboxEvent, OutboxEventStatus } from './entities/outbox-event.entity';
import { WebhookDispatchService } from '../webhooks/webhook-dispatch.service';
import { NotificationClientService } from '../notifications/notification-client.service';
import type { PaymentPaidEvent } from '../payment/payment.service';

describe('OutboxWorkerService', () => {
  let repository: jest.Mocked<Pick<Repository<OutboxEvent>, 'find' | 'update'>>;
  let webhookDispatch: jest.Mocked<Pick<WebhookDispatchService, 'dispatch'>>;
  let notificationClient: jest.Mocked<
    Pick<NotificationClientService, 'notify'>
  >;
  let service: OutboxWorkerService;

  function buildEvent(overrides: Partial<OutboxEvent> = {}): OutboxEvent {
    const payload: PaymentPaidEvent = {
      paymentId: 'payment-1',
      orderId: 'ORDER-1',
      provider: 'konnect' as PaymentPaidEvent['provider'],
      providerRef: 'ref-123',
      userId: 'user-1',
      callerApplication: 'billetterie',
      amount: '25.500',
      currency: 'TND',
    };
    return {
      id: 'event-1',
      eventType: 'PAYMENT_PAID',
      aggregateId: 'payment-1',
      payload: payload as unknown as Record<string, unknown>,
      status: OutboxEventStatus.PENDING,
      attempts: 0,
      nextRetryAt: null,
      createdAt: new Date(),
      processedAt: null,
      lastError: null,
      ...overrides,
    };
  }

  beforeEach(() => {
    repository = {
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    webhookDispatch = { dispatch: jest.fn().mockResolvedValue(undefined) };
    notificationClient = { notify: jest.fn().mockResolvedValue(undefined) };

    service = new OutboxWorkerService(
      repository as unknown as Repository<OutboxEvent>,
      webhookDispatch as unknown as WebhookDispatchService,
      notificationClient as unknown as NotificationClientService,
    );
  });

  it('marks a successfully delivered event PROCESSED, calling both notification and webhook', async () => {
    const event = buildEvent();
    repository.find.mockResolvedValue([event]);

    await service.processDueEvents();

    expect(notificationClient.notify).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', type: 'PAYMENT_SUCCEEDED' }),
    );
    expect(webhookDispatch.dispatch).toHaveBeenCalledWith(
      'billetterie',
      expect.objectContaining({ paymentId: 'payment-1', status: 'PAID' }),
    );
    expect(repository.update).toHaveBeenCalledWith(
      'event-1',
      expect.objectContaining({
        status: OutboxEventStatus.PROCESSED,
        lastError: null,
      }),
    );
  });

  it('skips the payer notification when the payload has no userId', async () => {
    const event = buildEvent({
      payload: { ...buildEvent().payload, userId: null } as unknown as Record<
        string,
        unknown
      >,
    });
    repository.find.mockResolvedValue([event]);

    await service.processDueEvents();

    expect(notificationClient.notify).not.toHaveBeenCalled();
    expect(webhookDispatch.dispatch).toHaveBeenCalled();
  });

  it('on webhook failure, increments attempts and schedules the next retry (TS-13), status stays PENDING', async () => {
    const event = buildEvent({ attempts: 0 });
    repository.find.mockResolvedValue([event]);
    webhookDispatch.dispatch.mockRejectedValue(new Error('network down'));

    await service.processDueEvents();

    expect(repository.update).toHaveBeenCalledWith(
      'event-1',
      expect.objectContaining({
        attempts: 1,
        status: OutboxEventStatus.PENDING,
        lastError: 'network down',
      }),
    );
    const call = repository.update.mock.calls[0][1] as { nextRetryAt: Date };
    expect(call.nextRetryAt).toBeInstanceOf(Date);
    expect(call.nextRetryAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('marks the event FAILED (DLQ) once the retry schedule is exhausted', async () => {
    const event = buildEvent({ attempts: 5 });
    repository.find.mockResolvedValue([event]);
    webhookDispatch.dispatch.mockRejectedValue(new Error('still down'));

    await service.processDueEvents();

    expect(repository.update).toHaveBeenCalledWith(
      'event-1',
      expect.objectContaining({
        attempts: 6,
        status: OutboxEventStatus.FAILED,
        nextRetryAt: null,
      }),
    );
  });

  it('marks an unknown event type FAILED without attempting delivery', async () => {
    const event = buildEvent({ eventType: 'SOMETHING_ELSE' });
    repository.find.mockResolvedValue([event]);

    await service.processDueEvents();

    expect(webhookDispatch.dispatch).not.toHaveBeenCalled();
    expect(notificationClient.notify).not.toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledWith(
      'event-1',
      expect.objectContaining({ status: OutboxEventStatus.FAILED }),
    );
  });

  it('never lets an overlapping call process the same batch twice', async () => {
    let resolveFind: (events: OutboxEvent[]) => void;
    repository.find.mockReturnValue(
      new Promise((resolve) => {
        resolveFind = resolve;
      }),
    );

    const firstRun = service.processDueEvents();
    const secondRun = service.processDueEvents();

    resolveFind!([]);
    await Promise.all([firstRun, secondRun]);

    expect(repository.find).toHaveBeenCalledTimes(1);
  });
});
