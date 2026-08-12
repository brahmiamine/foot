import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PayoutsService } from './payouts.service';
import { Payout } from './entities/payout.entity';
import { PayoutStatus } from './enums/payout-status.enum';
import { SellerOrder } from '../seller-orders/entities/seller-order.entity';

function buildQueryBuilder(rawResult: Record<string, unknown>) {
  const qb = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue(rawResult),
  };
  return qb;
}

describe('PayoutsService', () => {
  let repository: jest.Mocked<
    Pick<
      Repository<Payout>,
      'findOne' | 'save' | 'find' | 'create' | 'createQueryBuilder'
    >
  >;
  let sellerOrderRepository: jest.Mocked<
    Pick<Repository<SellerOrder>, 'createQueryBuilder'>
  >;
  let service: PayoutsService;

  function buildPayout(overrides: Partial<Payout> = {}): Payout {
    return {
      id: 'payout-1',
      sellerId: 'seller-1',
      reference: 'PO-ABCDEF12',
      amount: '100.000',
      status: PayoutStatus.PENDING,
      periodStart: '2026-01-01',
      periodEnd: '2026-02-01',
      paidAt: null,
      attempts: 0,
      lastError: null,
      ...overrides,
    } as Payout;
  }

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((entity) => entity as Payout),
      save: jest.fn((entity) => Promise.resolve(entity as Payout)),
      createQueryBuilder: jest.fn(),
    };
    sellerOrderRepository = {
      createQueryBuilder: jest.fn(),
    };
    service = new PayoutsService(
      repository as unknown as Repository<Payout>,
      sellerOrderRepository as unknown as Repository<SellerOrder>,
    );
  });

  describe('computeAvailableBalance (US-47)', () => {
    it('subtracts already-claimed payouts from delivered net revenue', async () => {
      sellerOrderRepository.createQueryBuilder.mockReturnValue(
        buildQueryBuilder({ total: '500.000' }) as never,
      );
      repository.createQueryBuilder.mockReturnValue(
        buildQueryBuilder({ total: '120.000' }) as never,
      );

      const balance = await service.computeAvailableBalance('seller-1');

      expect(balance).toBe(380);
    });

    it('never returns a negative balance', async () => {
      sellerOrderRepository.createQueryBuilder.mockReturnValue(
        buildQueryBuilder({ total: '50.000' }) as never,
      );
      repository.createQueryBuilder.mockReturnValue(
        buildQueryBuilder({ total: '200.000' }) as never,
      );

      const balance = await service.computeAvailableBalance('seller-1');

      expect(balance).toBe(0);
    });
  });

  describe('create (US-48)', () => {
    it('rejects creating a payout when there is no available balance', async () => {
      sellerOrderRepository.createQueryBuilder.mockReturnValue(
        buildQueryBuilder({ total: '0' }) as never,
      );
      repository.createQueryBuilder.mockReturnValue(
        buildQueryBuilder({ total: '0' }) as never,
      );

      await expect(service.create('seller-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('creates a PENDING payout for the full available balance', async () => {
      sellerOrderRepository.createQueryBuilder
        .mockReturnValueOnce(buildQueryBuilder({ total: '300.000' }) as never)
        .mockReturnValueOnce(
          buildQueryBuilder({ oldest: '2026-01-15T10:00:00.000Z' }) as never,
        );
      repository.createQueryBuilder.mockReturnValue(
        buildQueryBuilder({ total: '0' }) as never,
      );

      const payout = await service.create('seller-1');

      expect(payout.status).toBe(PayoutStatus.PENDING);
      expect(payout.amount).toBe('300.000');
      expect(payout.periodStart).toBe('2026-01-15');
    });
  });

  describe('transitions (US-48/US-49)', () => {
    it('PENDING -> PROCESSING increments attempts', async () => {
      repository.findOne.mockResolvedValue(buildPayout({ attempts: 1 }));

      const result = await service.markProcessing('payout-1');

      expect(result.status).toBe(PayoutStatus.PROCESSING);
      expect(result.attempts).toBe(2);
    });

    it('rejects PROCESSING from a non-PENDING payout', async () => {
      repository.findOne.mockResolvedValue(
        buildPayout({ status: PayoutStatus.PAID }),
      );

      await expect(service.markProcessing('payout-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('PROCESSING -> PAID sets paidAt and clears lastError', async () => {
      repository.findOne.mockResolvedValue(
        buildPayout({ status: PayoutStatus.PROCESSING, lastError: 'timeout' }),
      );

      const result = await service.markPaid('payout-1');

      expect(result.status).toBe(PayoutStatus.PAID);
      expect(result.paidAt).toBeInstanceOf(Date);
      expect(result.lastError).toBeNull();
    });

    it('PROCESSING -> FAILED records the reason (audit)', async () => {
      repository.findOne.mockResolvedValue(
        buildPayout({ status: PayoutStatus.PROCESSING }),
      );

      const result = await service.markFailed('payout-1', 'IBAN invalide');

      expect(result.status).toBe(PayoutStatus.FAILED);
      expect(result.lastError).toBe('IBAN invalide');
    });

    it('rejects FAILED from a non-PROCESSING payout', async () => {
      repository.findOne.mockResolvedValue(
        buildPayout({ status: PayoutStatus.PENDING }),
      );

      await expect(service.markFailed('payout-1', 'x')).rejects.toThrow(
        ConflictException,
      );
    });

    it('retry: FAILED -> PENDING, preserves attempts and lastError', async () => {
      repository.findOne.mockResolvedValue(
        buildPayout({
          status: PayoutStatus.FAILED,
          attempts: 2,
          lastError: 'IBAN invalide',
        }),
      );

      const result = await service.retry('payout-1');

      expect(result.status).toBe(PayoutStatus.PENDING);
      expect(result.attempts).toBe(2);
      expect(result.lastError).toBe('IBAN invalide');
    });

    it('rejects retry from a non-FAILED payout', async () => {
      repository.findOne.mockResolvedValue(
        buildPayout({ status: PayoutStatus.PENDING }),
      );

      await expect(service.retry('payout-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws NotFoundException for an unknown payout id', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.markProcessing('does-not-exist')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
