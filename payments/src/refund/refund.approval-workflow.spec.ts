import { ConflictException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { OutboxService } from '../outbox/outbox.service';
import { Payment } from '../payment/entities/payment.entity';
import { PaymentProviderName } from '../payment/enums/payment-provider.enum';
import { PaymentStatus } from '../payment/enums/payment-status.enum';
import { FlouciProvider } from '../payment/providers/flouci/flouci.provider';
import { Refund } from './entities/refund.entity';
import { RefundStatusHistory } from './entities/refund-status-history.entity';
import { RefundApprovalMode } from './enums/refund-approval-mode.enum';
import { RefundStatus } from './enums/refund-status.enum';
import { RefundApprovalPolicyService } from './refund-approval-policy.service';
import { RefundService } from './refund.service';

function payment(): Payment {
  return {
    id: 'payment-1',
    orderId: 'ORDER-1',
    userId: 'user-1',
    callerApplication: 'ticketing',
    idempotencyKey: null,
    provider: PaymentProviderName.FLOUCI,
    amount: '100.000',
    currency: 'TND',
    status: PaymentStatus.PAID,
    providerRef: 'flouci-payment-1',
    payUrl: 'https://example.test/pay',
    lastProviderStatus: 'SUCCESS',
    paidAt: new Date(),
    receivedAmount: null,
    providerFee: null,
    lastWebhookAt: null,
    webhookReceivedCount: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

class FakeDb {
  payments = new Map<string, Payment>();
  refunds = new Map<string, Refund>();
  history: RefundStatusHistory[] = [];
  private refundSeq = 0;

  refundRepo() {
    return {
      manager: this.manager(),
      create: (data: Partial<Refund>) => ({ ...data }) as Refund,
      save: (refund: Refund) => {
        if (!refund.id) refund.id = `refund-${++this.refundSeq}`;
        this.refunds.set(refund.id, { ...refund });
        return Promise.resolve(refund);
      },
      update: (id: string, patch: Partial<Refund>) => {
        const current = this.refunds.get(id);
        if (current) this.refunds.set(id, { ...current, ...patch });
        return Promise.resolve({ affected: current ? 1 : 0 });
      },
      findOne: ({ where }: { where: Partial<Refund> }) => {
        for (const refund of this.refunds.values()) {
          if (where.id !== undefined && refund.id !== where.id) continue;
          if (
            where.paymentId !== undefined &&
            refund.paymentId !== where.paymentId
          ) {
            continue;
          }
          if (
            'idempotencyKey' in where &&
            refund.idempotencyKey !== where.idempotencyKey
          ) {
            continue;
          }
          return Promise.resolve({ ...refund });
        }
        return Promise.resolve(null);
      },
      find: () =>
        Promise.resolve(
          [...this.refunds.values()].map((item) => ({ ...item })),
        ),
      createQueryBuilder: () => {
        let targetPaymentId = '';
        let excluded = '';
        let statuses: RefundStatus[] = [];
        const qb = {
          select: () => qb,
          where: (_sql: string, params: { paymentId: string }) => {
            targetPaymentId = params.paymentId;
            return qb;
          },
          andWhere: (
            _sql: string,
            params: { excludeRefundId?: string; statuses?: RefundStatus[] },
          ) => {
            if (params.excludeRefundId) excluded = params.excludeRefundId;
            if (params.statuses) statuses = params.statuses;
            return qb;
          },
          getRawOne: () => {
            const total = [...this.refunds.values()]
              .filter(
                (refund) =>
                  refund.paymentId === targetPaymentId &&
                  refund.id !== excluded &&
                  statuses.includes(refund.status),
              )
              .reduce((sum, refund) => sum + Number(refund.amount), 0);
            return Promise.resolve({ total: total.toFixed(3) });
          },
        };
        return qb;
      },
    };
  }

  manager(): EntityManager {
    const getRepository = (entity: unknown) => {
      if (entity === Refund) return this.refundRepo();
      if (entity === RefundStatusHistory) {
        return {
          insert: (data: Partial<RefundStatusHistory>) => {
            this.history.push({
              id: `history-${this.history.length + 1}`,
              createdAt: new Date(),
              ...data,
            } as RefundStatusHistory);
            return Promise.resolve();
          },
          find: () => Promise.resolve(this.history),
        };
      }
      if (entity === Payment) {
        return {
          findOne: ({ where }: { where: { id: string } }) =>
            Promise.resolve(this.payments.get(where.id) ?? null),
        };
      }
      throw new Error('Unexpected entity');
    };
    const createQueryBuilder = (entity: unknown) => {
      if (entity !== Payment) throw new Error('Unexpected lock entity');
      let id = '';
      const qb = {
        setLock: () => qb,
        where: (_sql: string, params: { id: string }) => {
          id = params.id;
          return qb;
        },
        getOne: () => Promise.resolve(this.payments.get(id) ?? null),
      };
      return qb;
    };
    return { getRepository, createQueryBuilder } as unknown as EntityManager;
  }
}

function buildService(mode: RefundApprovalMode) {
  const db = new FakeDb();
  db.payments.set('payment-1', payment());
  const dataSource = {
    transaction: jest.fn((callback: (manager: EntityManager) => unknown) =>
      Promise.resolve(callback(db.manager())),
    ),
  };
  const flouciProvider = {
    refundPayment: jest.fn().mockResolvedValue({
      providerRefundRef: 'refund-provider-1',
      providerStatus: 'success',
    }),
  };
  const outbox = { enqueue: jest.fn().mockResolvedValue(undefined) };
  const policy = {
    getEffectivePolicy: jest.fn().mockResolvedValue({
      consumerApplication: 'ticketing',
      autoMaxAmount: null,
      dualApprovalMinAmount: null,
      makerCheckerEnabled: true,
      version: 7,
      source: 'PERSISTED',
    }),
    resolveMode: jest.fn().mockReturnValue(mode),
  };
  const refundRepo = db.refundRepo();
  const service = new RefundService(
    {
      findOne: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(db.payments.get(where.id) ?? null),
      ),
    } as never,
    refundRepo as never,
    {
      find: jest.fn(() => Promise.resolve(db.history)),
    } as never,
    dataSource as unknown as DataSource,
    flouciProvider as unknown as FlouciProvider,
    outbox as unknown as OutboxService,
    policy as unknown as RefundApprovalPolicyService,
  );
  return { db, service, flouciProvider };
}

describe('RefundService approval governance', () => {
  it('does not call the provider before SINGLE approval and forbids maker self-approval', async () => {
    const { service, flouciProvider } = buildService(
      RefundApprovalMode.SINGLE_APPROVAL,
    );
    const created = await service.createRefund(
      'payment-1',
      { reason: 'support request' },
      'ticketing',
      'idem-1',
      'maker-1',
    );
    expect(created.status).toBe(RefundStatus.AWAITING_APPROVAL);
    expect(flouciProvider.refundPayment).not.toHaveBeenCalled();

    await expect(
      service.approveRefund(created.id, 'maker-1'),
    ).rejects.toBeInstanceOf(ConflictException);
    const approved = await service.approveRefund(created.id, 'checker-1');
    expect(approved.status).toBe(RefundStatus.SUCCEEDED);
    expect(flouciProvider.refundPayment).toHaveBeenCalledTimes(1);
  });

  it('requires two distinct operators for DUAL approval', async () => {
    const { service, flouciProvider } = buildService(
      RefundApprovalMode.DUAL_APPROVAL,
    );
    const created = await service.createRefund(
      'payment-1',
      { reason: 'large refund' },
      'ticketing',
      'idem-2',
      'maker-1',
    );

    const first = await service.approveRefund(created.id, 'checker-1');
    expect(first.status).toBe(RefundStatus.AWAITING_APPROVAL);
    expect(flouciProvider.refundPayment).not.toHaveBeenCalled();
    await expect(
      service.approveRefund(created.id, 'checker-1'),
    ).rejects.toBeInstanceOf(ConflictException);

    const second = await service.approveRefund(created.id, 'checker-2');
    expect(second.status).toBe(RefundStatus.SUCCEEDED);
    expect(flouciProvider.refundPayment).toHaveBeenCalledTimes(1);
  });

  it('cannot retry or manually confirm a refund rejected before approval', async () => {
    const { service } = buildService(RefundApprovalMode.SINGLE_APPROVAL);
    const created = await service.createRefund(
      'payment-1',
      { reason: 'request to reject' },
      'ticketing',
      'idem-3',
      'maker-1',
    );
    const rejected = await service.rejectApproval(created.id, {
      note: 'Rejected by finance',
      resolvedByUser: 'checker-1',
    });
    expect(rejected.status).toBe(RefundStatus.FAILED);
    await expect(service.retryRefund(created.id)).rejects.toThrow(
      'rejected before approval',
    );
    await expect(
      service.confirmManualRefund(created.id, {
        note: 'attempted bypass',
        resolvedByUser: 'checker-2',
      }),
    ).rejects.toThrow('rejected before approval');
  });
});
