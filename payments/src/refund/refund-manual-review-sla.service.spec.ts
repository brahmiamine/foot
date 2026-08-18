import { DataSource, EntityManager, Repository } from 'typeorm';
import { NotificationClientService } from '../notifications/notification-client.service';
import { Payment } from '../payment/entities/payment.entity';
import { PaymentProviderName } from '../payment/enums/payment-provider.enum';
import { Refund } from './entities/refund.entity';
import { RefundStatusHistory } from './entities/refund-status-history.entity';
import { RefundStatus } from './enums/refund-status.enum';
import { RefundManualReviewPolicyService } from './refund-manual-review-policy.service';
import { RefundManualReviewSlaService } from './refund-manual-review-sla.service';

function buildRefund(): Refund {
  const startedAt = new Date('2026-08-18T00:00:00.000Z');
  return {
    id: 'refund-1',
    paymentId: 'payment-1',
    provider: PaymentProviderName.PAYMEE,
    idempotencyKey: null,
    amount: '100.000',
    currency: 'TND',
    status: RefundStatus.MANUAL_REVIEW,
    reason: 'customer request',
    initiatedByApplication: 'ticketing',
    initiatedByUser: null,
    providerRefundRef: null,
    lastProviderStatus: null,
    failureReason: null,
    manualReviewReason: 'Provider requires manual processing.',
    manualReviewPolicyVersion: 3,
    manualReviewStartedAt: startedAt,
    manualReviewReminderAt: new Date('2026-08-18T01:00:00.000Z'),
    manualReviewReminderSentAt: null,
    manualReviewDueAt: new Date('2026-08-18T02:00:00.000Z'),
    manualReviewEscalateAt: new Date('2026-08-18T03:00:00.000Z'),
    manualReviewEscalatedAt: null,
    resolvedByUser: null,
    resolutionNote: null,
    succeededAt: null,
    createdAt: startedAt,
    updatedAt: startedAt,
  };
}

function buildPayment(): Payment {
  return {
    id: 'payment-1',
    orderId: 'ORDER-1',
    userId: 'user-1',
    callerApplication: 'ticketing',
    idempotencyKey: null,
    provider: PaymentProviderName.PAYMEE,
    amount: '100.000',
    currency: 'TND',
    status: 'PAID',
    providerRef: 'provider-1',
    payUrl: null,
    lastProviderStatus: null,
    paidAt: new Date(),
    receivedAmount: null,
    providerFee: null,
    lastWebhookAt: null,
    webhookReceivedCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Payment;
}

function buildService() {
  const refund = buildRefund();
  const payment = buildPayment();
  const transition = {
    refundId: refund.id,
    toStatus: RefundStatus.MANUAL_REVIEW,
    createdAt: refund.manualReviewStartedAt,
  } as RefundStatusHistory;

  const refundManagerRepo = {
    findOne: jest.fn(() => Promise.resolve(refund)),
    update: jest.fn((_id: string, patch: Partial<Refund>) => {
      Object.assign(refund, patch);
      return Promise.resolve({ affected: 1 });
    }),
  };
  const manager = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === Refund) return refundManagerRepo;
      if (entity === Payment) {
        return { findOne: jest.fn(() => Promise.resolve(payment)) };
      }
      if (entity === RefundStatusHistory) {
        return { findOne: jest.fn(() => Promise.resolve(transition)) };
      }
      throw new Error('Unexpected entity');
    }),
  } as unknown as EntityManager;

  const refundRepository = {
    find: jest.fn(() => Promise.resolve([refund])),
  } as unknown as Repository<Refund>;
  const paymentRepository = {
    find: jest.fn(() => Promise.resolve([payment])),
  } as unknown as Repository<Payment>;
  const dataSource = {
    transaction: jest.fn((callback: (value: EntityManager) => unknown) =>
      Promise.resolve(callback(manager)),
    ),
  } as unknown as DataSource;
  const policyService = {
    getEffectivePolicy: jest.fn().mockResolvedValue({
      consumerApplication: 'ticketing',
      slaMinutes: 120,
      reminderBeforeDueMinutes: 60,
      escalationAfterDueMinutes: 60,
      version: 3,
      source: 'PERSISTED',
    }),
  } as unknown as RefundManualReviewPolicyService;
  const notificationClient = {
    notifyRequired: jest.fn().mockResolvedValue(undefined),
  } as unknown as NotificationClientService;
  const service = new RefundManualReviewSlaService(
    refundRepository,
    paymentRepository,
    dataSource,
    policyService,
    notificationClient,
  );
  jest.spyOn(service, 'initializeSchedules').mockResolvedValue(0);
  return {
    refund,
    service,
    notificationClient: notificationClient as unknown as {
      notifyRequired: jest.Mock;
    },
  };
}

describe('RefundManualReviewSlaService', () => {
  it('emits an idempotent reminder to canonical and legacy platform admins', async () => {
    const { refund, service, notificationClient } = buildService();
    const now = new Date('2026-08-18T01:30:00.000Z');

    await expect(service.processDueAlerts(now)).resolves.toMatchObject({
      reminders: 1,
      escalations: 0,
      errors: 0,
    });
    await expect(service.processDueAlerts(now)).resolves.toMatchObject({
      reminders: 0,
      escalations: 0,
      errors: 0,
    });
    expect(notificationClient.notifyRequired).toHaveBeenCalledTimes(2);
    expect(refund.manualReviewReminderSentAt).toEqual(now);
  });

  it('emits an escalation once after the escalation deadline', async () => {
    const { refund, service, notificationClient } = buildService();
    refund.manualReviewReminderSentAt = new Date('2026-08-18T01:30:00.000Z');
    const now = new Date('2026-08-18T03:30:00.000Z');

    const result = await service.processDueAlerts(now);
    expect(result).toMatchObject({ reminders: 0, escalations: 1, errors: 0 });
    expect(notificationClient.notifyRequired).toHaveBeenCalledTimes(2);
    expect(refund.manualReviewEscalatedAt).toEqual(now);
  });

  it('does not advance the delivery marker when notifications fails', async () => {
    const { refund, service, notificationClient } = buildService();
    notificationClient.notifyRequired.mockRejectedValueOnce(
      new Error('notifications unavailable'),
    );
    const now = new Date('2026-08-18T01:30:00.000Z');

    const failed = await service.processDueAlerts(now);
    expect(failed.errors).toBe(1);
    expect(refund.manualReviewReminderSentAt).toBeNull();

    const retried = await service.processDueAlerts(now);
    expect(retried.reminders).toBe(1);
    expect(refund.manualReviewReminderSentAt).toEqual(now);
    expect(notificationClient.notifyRequired).toHaveBeenCalledTimes(3);
  });

  it('classifies dashboard rows from the persisted SLA snapshot', async () => {
    const { service } = buildService();
    const dashboard = await service.getDashboard(
      new Date('2026-08-18T02:30:00.000Z'),
    );
    expect(dashboard.summary).toMatchObject({
      total: 1,
      overdue: 1,
      escalated: 0,
    });
    expect(dashboard.items[0]).toMatchObject({
      refundId: 'refund-1',
      orderId: 'ORDER-1',
      state: 'OVERDUE',
      policyVersion: 3,
    });
  });
});
