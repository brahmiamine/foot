import { EntityManager, Repository } from 'typeorm';
import { OutboxService } from './outbox.service';
import { OutboxEvent, OutboxEventStatus } from './entities/outbox-event.entity';

describe('OutboxService.enqueue', () => {
  it('inserts a PENDING outbox row via the manager passed by the caller, never its own repository', async () => {
    const insert = jest.fn().mockResolvedValue({});
    const repository = { insert } as unknown as Repository<OutboxEvent>;
    const getRepository = jest.fn().mockReturnValue(repository);
    const manager = { getRepository } as unknown as EntityManager;

    const service = new OutboxService();
    await service.enqueue(manager, {
      eventType: 'PAYMENT_PAID',
      aggregateId: 'payment-1',
      payload: { paymentId: 'payment-1', orderId: 'ORDER-1' },
    });

    expect(getRepository).toHaveBeenCalledWith(OutboxEvent);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'PAYMENT_PAID',
        aggregateId: 'payment-1',
        payload: { paymentId: 'payment-1', orderId: 'ORDER-1' },
        status: OutboxEventStatus.PENDING,
      }),
    );
  });
});
