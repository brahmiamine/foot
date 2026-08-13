import { EntityManager, Repository } from 'typeorm';
import { OutboxService } from './outbox.service';
import { OutboxEvent, OutboxEventStatus } from './entities/outbox-event.entity';

describe('OutboxService', () => {
  describe('enqueue', () => {
    it('inserts a PENDING outbox row via the manager passed by the caller, never its own repository', async () => {
      const insert = jest.fn().mockResolvedValue({});
      const repository = { insert } as unknown as Repository<OutboxEvent>;
      const getRepository = jest.fn().mockReturnValue(repository);
      const manager = { getRepository } as unknown as EntityManager;

      const service = new OutboxService(
        {} as unknown as Repository<OutboxEvent>,
      );
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

  describe('getStats', () => {
    it('counts events by status (TASK-P0-006)', async () => {
      const count = jest
        .fn()
        .mockImplementation(
          ({ where }: { where: { status: OutboxEventStatus } }) => {
            if (where.status === OutboxEventStatus.PENDING) return 3;
            if (where.status === OutboxEventStatus.PROCESSED) return 40;
            if (where.status === OutboxEventStatus.FAILED) return 2;
            return 0;
          },
        );
      const repository = { count } as unknown as Repository<OutboxEvent>;
      const service = new OutboxService(repository);

      const stats = await service.getStats();

      expect(stats).toEqual({ pending: 3, processed: 40, dlq: 2 });
    });
  });
});
