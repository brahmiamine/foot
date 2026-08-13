import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import { Payment } from '../payment/entities/payment.entity';
import { PaymentStatus } from '../payment/enums/payment-status.enum';
import { PaymentProviderName } from '../payment/enums/payment-provider.enum';
import { FlouciProvider } from '../payment/providers/flouci/flouci.provider';
import { FlouciBadRequestError } from '../payment/providers/flouci/flouci.exceptions';
import { OutboxService } from '../outbox/outbox.service';
import { Refund } from './entities/refund.entity';
import { RefundStatusHistory } from './entities/refund-status-history.entity';
import { RefundStatus } from './enums/refund-status.enum';
import {
  REFUND_FAILED_EVENT_TYPE,
  REFUND_MANUAL_REVIEW_EVENT_TYPE,
  REFUND_SUCCEEDED_EVENT_TYPE,
  RefundService,
} from './refund.service';
import {
  RefundAmountExceedsRemainingError,
  RefundInvalidStateError,
  RefundNotFoundError,
  RefundPaymentNotPaidError,
} from './refund.exceptions';

function buildPayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'payment-1',
    orderId: 'ORDER-1',
    userId: 'user-1',
    callerApplication: 'billetterie',
    idempotencyKey: null,
    provider: PaymentProviderName.FLOUCI,
    amount: '100.000',
    currency: 'TND',
    status: PaymentStatus.PAID,
    providerRef: 'flouci-ref-1',
    payUrl: 'https://flouci.com/pay/abc',
    lastProviderStatus: 'SUCCESS',
    paidAt: new Date(),
    receivedAmount: null,
    providerFee: null,
    lastWebhookAt: null,
    webhookReceivedCount: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * In-memory fake for everything RefundService touches through
 * DataSource.transaction()/EntityManager, so tests exercise the real
 * business rules (remaining-amount math, status transitions, idempotency)
 * instead of a brittle mock of TypeORM's fluent query-builder API.
 */
class FakeDb {
  payments = new Map<string, Payment>();
  refunds = new Map<string, Refund>();
  history: RefundStatusHistory[] = [];
  private refundSeq = 0;
  private historySeq = 0;

  seedPayment(payment: Payment): void {
    this.payments.set(payment.id, payment);
  }

  private refundRepo() {
    return {
      create: (data: Partial<Refund>) => ({ ...data }) as Refund,
      save: (refund: Refund) => {
        if (!refund.id) refund.id = `refund-${++this.refundSeq}`;
        this.refunds.set(refund.id, { ...refund });
        return Promise.resolve(refund);
      },
      update: (id: string, patch: Partial<Refund>) => {
        const existing = this.refunds.get(id);
        if (existing) this.refunds.set(id, { ...existing, ...patch });
        return Promise.resolve({ affected: existing ? 1 : 0 });
      },
      findOne: ({ where }: { where: Partial<Refund> }) => {
        for (const r of this.refunds.values()) {
          if (where.id !== undefined && r.id !== where.id) continue;
          if (where.paymentId !== undefined && r.paymentId !== where.paymentId)
            continue;
          if (
            'idempotencyKey' in where &&
            r.idempotencyKey !== where.idempotencyKey
          )
            continue;
          if (where.status !== undefined && r.status !== where.status) continue;
          return Promise.resolve({ ...r });
        }
        return Promise.resolve(null);
      },
      find: ({ where }: { where: Partial<Refund> }) => {
        const results = [...this.refunds.values()].filter((r) => {
          if (where.paymentId !== undefined && r.paymentId !== where.paymentId)
            return false;
          if (where.status !== undefined && r.status !== where.status)
            return false;
          return true;
        });
        return Promise.resolve(results.map((r) => ({ ...r })));
      },
      createQueryBuilder: () => {
        let paymentId: string | undefined;
        let statuses: RefundStatus[] | undefined;
        let excludeId: string | undefined;
        const qb = {
          select: () => qb,
          where: (_expr: string, params: { paymentId: string }) => {
            paymentId = params.paymentId;
            return qb;
          },
          andWhere: (
            _expr: string,
            params: { statuses?: RefundStatus[]; excludeRefundId?: string },
          ) => {
            if (params.statuses) statuses = params.statuses;
            if (params.excludeRefundId) excludeId = params.excludeRefundId;
            return qb;
          },
          getRawOne: () => {
            let total = 0;
            for (const r of this.refunds.values()) {
              if (r.paymentId !== paymentId) continue;
              if (excludeId && r.id === excludeId) continue;
              if (statuses && !statuses.includes(r.status)) continue;
              total += Number(r.amount);
            }
            return Promise.resolve({ total: total.toFixed(3) });
          },
        };
        return qb;
      },
    };
  }

  private historyRepo() {
    return {
      insert: (data: Partial<RefundStatusHistory>) => {
        this.history.push({
          id: `history-${++this.historySeq}`,
          createdAt: new Date(),
          ...data,
        } as RefundStatusHistory);
        return Promise.resolve();
      },
      find: ({ where }: { where: Partial<RefundStatusHistory> }) =>
        Promise.resolve(
          this.history.filter((h) => h.refundId === where.refundId),
        ),
    };
  }

  private paymentRepo() {
    return {
      findOne: ({ where }: { where: { id: string } }) => {
        const p = this.payments.get(where.id);
        return Promise.resolve(p ? { ...p } : null);
      },
    };
  }

  manager(): EntityManager {
    const getRepository = (Entity: unknown) => {
      if (Entity === Refund) return this.refundRepo();
      if (Entity === RefundStatusHistory) return this.historyRepo();
      if (Entity === Payment) return this.paymentRepo();
      throw new Error('Unexpected entity in fake manager');
    };
    const createQueryBuilder = (Entity: unknown) => {
      if (Entity !== Payment) throw new Error('Unexpected lock target');
      let id: string | undefined;
      const qb = {
        setLock: () => qb,
        where: (_expr: string, params: { id: string }) => {
          id = params.id;
          return qb;
        },
        getOne: () => {
          const p = this.payments.get(id!);
          return Promise.resolve(p ? { ...p } : null);
        },
      };
      return qb;
    };
    return {
      getRepository,
      createQueryBuilder,
    } as unknown as EntityManager;
  }
}

describe('RefundService', () => {
  let db: FakeDb;
  let dataSource: jest.Mocked<Pick<DataSource, 'transaction'>>;
  let flouciProvider: jest.Mocked<Pick<FlouciProvider, 'refundPayment'>>;
  let outboxService: jest.Mocked<Pick<OutboxService, 'enqueue'>>;
  let service: RefundService;

  beforeEach(() => {
    db = new FakeDb();
    dataSource = {
      transaction: jest
        .fn()
        .mockImplementation(
          (cb: (manager: EntityManager) => Promise<unknown>) =>
            cb(db.manager()),
        ),
    };
    flouciProvider = { refundPayment: jest.fn() };
    outboxService = { enqueue: jest.fn().mockResolvedValue(undefined) };

    const paymentRepository = {
      findOne: ({ where }: { where: { id: string } }) =>
        Promise.resolve(db.payments.get(where.id) ?? null),
    };
    const refundRepository = {
      findOne: ({ where }: { where: Partial<Refund> }) =>
        db.manager().getRepository(Refund).findOne({ where }),
      find: ({ where }: { where: Partial<Refund>; order?: unknown }) =>
        db.manager().getRepository(Refund).find({ where }),
      manager: db.manager(),
    };
    const historyRepository = {
      find: ({ where }: { where: Partial<RefundStatusHistory> }) =>
        db.manager().getRepository(RefundStatusHistory).find({ where }),
    };

    service = new RefundService(
      paymentRepository as never,
      refundRepository as never,
      historyRepository as never,
      dataSource as unknown as DataSource,
      flouciProvider as unknown as FlouciProvider,
      outboxService,
    );
  });

  describe('createRefund', () => {
    it('auto-refunds a full Flouci payment and enqueues REFUND_SUCCEEDED', async () => {
      db.seedPayment(buildPayment());
      flouciProvider.refundPayment.mockResolvedValue({
        providerRefundRef: 'flouci-refund-1',
        providerStatus: 'success',
      });

      const refund = await service.createRefund(
        'payment-1',
        { reason: 'Client request' },
        'billetterie',
      );

      expect(refund.status).toBe(RefundStatus.SUCCEEDED);
      expect(refund.amount).toBe('100.000');
      expect(refund.providerRefundRef).toBe('flouci-refund-1');
      expect(flouciProvider.refundPayment).toHaveBeenCalledWith('flouci-ref-1');
      expect(outboxService.enqueue).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ eventType: REFUND_SUCCEEDED_EVENT_TYPE }),
      );

      const history = db.history.filter((h) => h.refundId === refund.id);
      expect(history.map((h) => h.toStatus)).toEqual([
        RefundStatus.REQUESTED,
        RefundStatus.PROCESSING,
        RefundStatus.SUCCEEDED,
      ]);
    });

    it('marks the refund FAILED (never a fake success) when Flouci rejects the refund — provider unavailable/rejected case', async () => {
      db.seedPayment(buildPayment());
      flouciProvider.refundPayment.mockRejectedValue(
        new FlouciBadRequestError('Payment cannot be refunded'),
      );

      const refund = await service.createRefund(
        'payment-1',
        { reason: 'Client request' },
        'billetterie',
      );

      expect(refund.status).toBe(RefundStatus.FAILED);
      expect(refund.failureReason).toContain('Payment cannot be refunded');
      expect(outboxService.enqueue).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ eventType: REFUND_FAILED_EVENT_TYPE }),
      );
    });

    it('routes a Konnect refund straight to MANUAL_REVIEW without ever calling a nonexistent provider API', async () => {
      db.seedPayment(buildPayment({ provider: PaymentProviderName.KONNECT }));

      const refund = await service.createRefund(
        'payment-1',
        { reason: 'Client request' },
        'billetterie',
      );

      expect(refund.status).toBe(RefundStatus.MANUAL_REVIEW);
      expect(refund.manualReviewReason).toContain('konnect');
      expect(flouciProvider.refundPayment).not.toHaveBeenCalled();
      expect(outboxService.enqueue).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ eventType: REFUND_MANUAL_REVIEW_EVENT_TYPE }),
      );
    });

    it('routes a Paymee refund straight to MANUAL_REVIEW (no automated refund API)', async () => {
      db.seedPayment(buildPayment({ provider: PaymentProviderName.PAYMEE }));

      const refund = await service.createRefund(
        'payment-1',
        { reason: 'Client request' },
        'billetterie',
      );

      expect(refund.status).toBe(RefundStatus.MANUAL_REVIEW);
    });

    it('routes a partial Flouci refund to MANUAL_REVIEW — Flouci only refunds the full amount', async () => {
      db.seedPayment(buildPayment());

      const refund = await service.createRefund(
        'payment-1',
        { reason: 'Partial goodwill refund', amount: 40 },
        'billetterie',
      );

      expect(refund.status).toBe(RefundStatus.MANUAL_REVIEW);
      expect(refund.manualReviewReason).toContain('full');
      expect(flouciProvider.refundPayment).not.toHaveBeenCalled();
    });

    it('rejects a refund amount exceeding what remains refundable', async () => {
      db.seedPayment(buildPayment({ amount: '50.000' }));

      await expect(
        service.createRefund(
          'payment-1',
          { reason: 'Too much', amount: 75 },
          'billetterie',
        ),
      ).rejects.toThrow(RefundAmountExceedsRemainingError);
      expect(flouciProvider.refundPayment).not.toHaveBeenCalled();
    });

    it('accounts for already-reserved refunds when computing the remaining amount (concurrency-safe math)', async () => {
      db.seedPayment(buildPayment({ amount: '100.000' }));
      db.refunds.set('refund-existing', {
        id: 'refund-existing',
        paymentId: 'payment-1',
        provider: PaymentProviderName.FLOUCI,
        idempotencyKey: null,
        amount: '60.000',
        currency: 'TND',
        status: RefundStatus.SUCCEEDED,
        reason: 'Earlier refund',
        initiatedByApplication: 'billetterie',
        initiatedByUser: null,
        providerRefundRef: 'ref-earlier',
        lastProviderStatus: 'success',
        failureReason: null,
        manualReviewReason: null,
        resolvedByUser: null,
        resolutionNote: null,
        succeededAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 60 already reserved, only 40 left — asking for 50 must fail.
      await expect(
        service.createRefund(
          'payment-1',
          { reason: 'Second refund', amount: 50 },
          'billetterie',
        ),
      ).rejects.toThrow(RefundAmountExceedsRemainingError);

      // Asking for exactly what remains succeeds and goes to MANUAL_REVIEW
      // (it's a partial amount relative to the original payment).
      const refund = await service.createRefund(
        'payment-1',
        { reason: 'Second refund', amount: 40 },
        'billetterie',
      );
      expect(refund.status).toBe(RefundStatus.MANUAL_REVIEW);
    });

    it('refuses to refund a payment that is not PAID', async () => {
      db.seedPayment(buildPayment({ status: PaymentStatus.PENDING }));

      await expect(
        service.createRefund('payment-1', { reason: 'x' }, 'billetterie'),
      ).rejects.toThrow(RefundPaymentNotPaidError);
    });

    it('throws RefundNotFoundError for an unknown payment', async () => {
      await expect(
        service.createRefund('missing-payment', { reason: 'x' }, 'billetterie'),
      ).rejects.toThrow(RefundNotFoundError);
    });

    it('replays idempotently instead of creating a second refund (tests de rejeu)', async () => {
      db.seedPayment(buildPayment());
      flouciProvider.refundPayment.mockResolvedValue({
        providerRefundRef: 'flouci-refund-1',
        providerStatus: 'success',
      });

      const first = await service.createRefund(
        'payment-1',
        { reason: 'Client request' },
        'billetterie',
        'idem-key-1',
      );
      const second = await service.createRefund(
        'payment-1',
        { reason: 'Client request' },
        'billetterie',
        'idem-key-1',
      );

      expect(second.id).toBe(first.id);
      expect(flouciProvider.refundPayment).toHaveBeenCalledTimes(1);
    });

    it('recovers from a concurrent duplicate-idempotency-key race by returning the winner', async () => {
      db.seedPayment(buildPayment());
      const winner: Refund = {
        id: 'refund-winner',
        paymentId: 'payment-1',
        provider: PaymentProviderName.FLOUCI,
        idempotencyKey: 'race-key',
        amount: '100.000',
        currency: 'TND',
        status: RefundStatus.SUCCEEDED,
        reason: 'Client request',
        initiatedByApplication: 'billetterie',
        initiatedByUser: null,
        providerRefundRef: 'flouci-refund-winner',
        lastProviderStatus: 'success',
        failureReason: null,
        manualReviewReason: null,
        resolvedByUser: null,
        resolutionNote: null,
        succeededAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const duplicateError = Object.assign(new Error('Duplicate entry'), {
        code: 'ER_DUP_ENTRY',
      });
      Object.setPrototypeOf(duplicateError, QueryFailedError.prototype);
      dataSource.transaction.mockImplementationOnce(() => {
        db.refunds.set(winner.id, winner);
        return Promise.reject(duplicateError);
      });

      const result = await service.createRefund(
        'payment-1',
        { reason: 'Client request' },
        'billetterie',
        'race-key',
      );

      expect(result.id).toBe('refund-winner');
      expect(flouciProvider.refundPayment).not.toHaveBeenCalled();
    });
  });

  describe('retryRefund', () => {
    it('re-attempts a FAILED Flouci refund and can succeed on retry (succès tardif)', async () => {
      db.seedPayment(buildPayment());
      flouciProvider.refundPayment.mockRejectedValueOnce(
        new FlouciBadRequestError('Temporary provider issue'),
      );
      const created = await service.createRefund(
        'payment-1',
        { reason: 'Client request' },
        'billetterie',
      );
      expect(created.status).toBe(RefundStatus.FAILED);

      flouciProvider.refundPayment.mockResolvedValueOnce({
        providerRefundRef: 'flouci-refund-retry',
        providerStatus: 'success',
      });
      const retried = await service.retryRefund(created.id);

      expect(retried.status).toBe(RefundStatus.SUCCEEDED);
      expect(retried.providerRefundRef).toBe('flouci-refund-retry');
    });

    it('rejects retrying a refund that is not FAILED', async () => {
      db.seedPayment(buildPayment({ provider: PaymentProviderName.KONNECT }));
      const created = await service.createRefund(
        'payment-1',
        { reason: 'Client request' },
        'billetterie',
      );
      expect(created.status).toBe(RefundStatus.MANUAL_REVIEW);

      await expect(service.retryRefund(created.id)).rejects.toThrow(
        RefundInvalidStateError,
      );
    });
  });

  describe('confirmManualRefund', () => {
    it('moves a MANUAL_REVIEW refund to SUCCEEDED and enqueues REFUND_SUCCEEDED', async () => {
      db.seedPayment(buildPayment({ provider: PaymentProviderName.KONNECT }));
      const created = await service.createRefund(
        'payment-1',
        { reason: 'Client request' },
        'billetterie',
      );

      const confirmed = await service.confirmManualRefund(created.id, {
        resolvedByUser: 'ops-alice',
        note: 'Bank transfer completed manually.',
      });

      expect(confirmed.status).toBe(RefundStatus.SUCCEEDED);
      expect(confirmed.resolvedByUser).toBe('ops-alice');
      expect(outboxService.enqueue).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ eventType: REFUND_SUCCEEDED_EVENT_TYPE }),
      );
    });

    it('is idempotent when the refund is already SUCCEEDED', async () => {
      db.seedPayment(buildPayment());
      flouciProvider.refundPayment.mockResolvedValue({
        providerRefundRef: 'flouci-refund-1',
        providerStatus: 'success',
      });
      const created = await service.createRefund(
        'payment-1',
        { reason: 'Client request' },
        'billetterie',
      );
      jest.clearAllMocks();

      const result = await service.confirmManualRefund(created.id, {
        resolvedByUser: 'ops-alice',
        note: 'no-op',
      });

      expect(result.status).toBe(RefundStatus.SUCCEEDED);
      expect(outboxService.enqueue).not.toHaveBeenCalled();
    });

    it('rejects confirming a refund still in REQUESTED/PROCESSING', async () => {
      db.seedPayment(buildPayment());
      db.refunds.set('refund-req', {
        id: 'refund-req',
        paymentId: 'payment-1',
        provider: PaymentProviderName.FLOUCI,
        idempotencyKey: null,
        amount: '100.000',
        currency: 'TND',
        status: RefundStatus.REQUESTED,
        reason: 'x',
        initiatedByApplication: 'billetterie',
        initiatedByUser: null,
        providerRefundRef: null,
        lastProviderStatus: null,
        failureReason: null,
        manualReviewReason: null,
        resolvedByUser: null,
        resolutionNote: null,
        succeededAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.confirmManualRefund('refund-req', {
          resolvedByUser: 'ops-alice',
          note: 'x',
        }),
      ).rejects.toThrow(RefundInvalidStateError);
    });
  });

  describe('rejectManualRefund', () => {
    it('moves a MANUAL_REVIEW refund to FAILED (terminal) and enqueues REFUND_FAILED', async () => {
      db.seedPayment(buildPayment({ provider: PaymentProviderName.PAYMEE }));
      const created = await service.createRefund(
        'payment-1',
        { reason: 'Client request' },
        'billetterie',
      );

      const rejected = await service.rejectManualRefund(created.id, {
        resolvedByUser: 'ops-bob',
        note: 'Fraud suspicion, refund denied.',
      });

      expect(rejected.status).toBe(RefundStatus.FAILED);
      expect(rejected.failureReason).toContain('Fraud suspicion');
      expect(outboxService.enqueue).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ eventType: REFUND_FAILED_EVENT_TYPE }),
      );
    });

    it('is idempotent when the refund is already FAILED', async () => {
      db.seedPayment(buildPayment({ provider: PaymentProviderName.KONNECT }));
      const created = await service.createRefund(
        'payment-1',
        { reason: 'Client request' },
        'billetterie',
      );
      await service.rejectManualRefund(created.id, {
        resolvedByUser: 'ops-bob',
        note: 'first rejection',
      });
      jest.clearAllMocks();

      const result = await service.rejectManualRefund(created.id, {
        resolvedByUser: 'ops-bob',
        note: 'second call, no-op',
      });

      expect(result.status).toBe(RefundStatus.FAILED);
      expect(outboxService.enqueue).not.toHaveBeenCalled();
    });
  });

  describe('getRemainingRefundable', () => {
    it('computes the remaining amount from non-FAILED refunds only', async () => {
      db.seedPayment(buildPayment({ amount: '100.000' }));
      db.refunds.set('refund-failed', {
        id: 'refund-failed',
        paymentId: 'payment-1',
        provider: PaymentProviderName.FLOUCI,
        idempotencyKey: null,
        amount: '30.000',
        currency: 'TND',
        status: RefundStatus.FAILED,
        reason: 'x',
        initiatedByApplication: 'billetterie',
        initiatedByUser: null,
        providerRefundRef: null,
        lastProviderStatus: null,
        failureReason: 'nope',
        manualReviewReason: null,
        resolvedByUser: null,
        resolutionNote: null,
        succeededAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { remaining } = await service.getRemainingRefundable('payment-1');

      expect(remaining).toBe('100.000');
    });
  });
});
