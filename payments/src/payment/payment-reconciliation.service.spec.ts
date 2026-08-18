import { DataSource, EntityManager, Repository } from 'typeorm';
import { PaymentReconciliationService } from './payment-reconciliation.service';
import { PaymentReconciliationCase } from './entities/payment-reconciliation-case.entity';
import { PaymentReconciliationEvent } from './entities/payment-reconciliation-event.entity';
import { Payment } from './entities/payment.entity';
import { PaymentProviderName } from './enums/payment-provider.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import {
  PaymentReconciliationDiscrepancyType,
  PaymentReconciliationEvidenceSource,
} from './payment-reconciliation.enums';
import { PaymentService } from './payment.service';

describe('PaymentReconciliationService', () => {
  let repository: jest.Mocked<Pick<Repository<Payment>, 'find' | 'findOne'>>;
  let paymentService: jest.Mocked<
    Pick<PaymentService, 'handleKonnectWebhook' | 'handleFlouciWebhook'>
  >;
  let caseCount: jest.Mock;
  let caseFindOne: jest.Mock;
  let caseCreate: jest.Mock;
  let caseSave: jest.Mock;
  let eventInsert: jest.Mock;
  let transactionPaymentFindOne: jest.Mock;
  let transaction: jest.Mock;
  let knownPayments: Map<string, Payment>;
  let service: PaymentReconciliationService;

  function buildPayment(overrides: Partial<Payment> = {}): Payment {
    const payment = {
      id: 'payment-1',
      orderId: 'ORDER-1',
      userId: null,
      callerApplication: 'ticketing',
      idempotencyKey: null,
      provider: PaymentProviderName.KONNECT,
      amount: '25.500',
      currency: 'TND',
      status: PaymentStatus.PENDING,
      providerRef: 'ref-123',
      payUrl: 'https://gateway.konnect.network/pay/abc',
      lastProviderStatus: null,
      paidAt: null,
      receivedAmount: null,
      providerFee: null,
      lastWebhookAt: null,
      webhookReceivedCount: 0,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      updatedAt: new Date(),
      ...overrides,
    } as Payment;
    knownPayments.set(payment.id, payment);
    return payment;
  }

  beforeEach(() => {
    knownPayments = new Map<string, Payment>();
    repository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    };
    paymentService = {
      handleKonnectWebhook: jest.fn().mockResolvedValue(undefined),
      handleFlouciWebhook: jest.fn().mockResolvedValue(undefined),
    };

    caseCount = jest.fn().mockResolvedValue(0);
    caseFindOne = jest.fn().mockResolvedValue(null);
    caseCreate = jest.fn((input: Partial<PaymentReconciliationCase>) => ({
      id: 'case-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...input,
    }));
    caseSave = jest.fn(async (input: PaymentReconciliationCase) => input);
    eventInsert = jest.fn().mockResolvedValue(undefined);
    transactionPaymentFindOne = jest.fn(
      async (options: { where: { id: string } }) =>
        knownPayments.get(options.where.id) ?? null,
    );

    const caseRepository = {
      count: caseCount,
      findOne: caseFindOne,
      create: caseCreate,
      save: caseSave,
    } as unknown as Repository<PaymentReconciliationCase>;
    const eventRepository = {
      insert: eventInsert,
    } as unknown as Repository<PaymentReconciliationEvent>;
    const transactionPaymentRepository = {
      findOne: transactionPaymentFindOne,
    } as unknown as Repository<Payment>;
    const manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === Payment) return transactionPaymentRepository;
        if (entity === PaymentReconciliationCase) return caseRepository;
        if (entity === PaymentReconciliationEvent) return eventRepository;
        throw new Error('Unexpected repository requested by reconciliation test');
      }),
    } as unknown as EntityManager;
    transaction = jest.fn(
      async (callback: (entityManager: EntityManager) => Promise<unknown>) =>
        callback(manager),
    );
    const dataSource = {
      transaction,
    } as unknown as DataSource;

    service = new PaymentReconciliationService(
      repository as unknown as Repository<Payment>,
      caseRepository,
      eventRepository,
      dataSource,
      paymentService as unknown as PaymentService,
    );
  });

  it('re-verifies a stale Konnect payment via handleKonnectWebhook', async () => {
    const payment = buildPayment({
      provider: PaymentProviderName.KONNECT,
      providerRef: 'ref-konnect',
    });
    repository.find.mockResolvedValue([payment]);
    repository.findOne.mockResolvedValue({
      ...payment,
      status: PaymentStatus.PAID,
    });

    const report = await service.reconcileStalePayments();

    expect(paymentService.handleKonnectWebhook).toHaveBeenCalledWith(
      'ref-konnect',
    );
    expect(report.staleCount).toBe(1);
    expect(report.resolvedCount).toBe(1);
    expect(report.stillPendingCount).toBe(0);
  });

  it('re-verifies a stale Flouci payment via handleFlouciWebhook', async () => {
    const payment = buildPayment({
      provider: PaymentProviderName.FLOUCI,
      providerRef: 'ref-flouci',
    });
    repository.find.mockResolvedValue([payment]);
    repository.findOne.mockResolvedValue({
      ...payment,
      status: PaymentStatus.FAILED,
    });

    const report = await service.reconcileStalePayments();

    expect(paymentService.handleFlouciWebhook).toHaveBeenCalledWith(
      'ref-flouci',
    );
    expect(report.resolvedCount).toBe(1);
  });

  it('counts a payment still PENDING after verification as unresolved', async () => {
    const payment = buildPayment({
      provider: PaymentProviderName.KONNECT,
      providerRef: 'ref-konnect',
    });
    repository.find.mockResolvedValue([payment]);
    repository.findOne.mockResolvedValue({
      ...payment,
      status: PaymentStatus.PENDING,
    });

    const report = await service.reconcileStalePayments();

    expect(report.resolvedCount).toBe(0);
    expect(report.stillPendingCount).toBe(1);
    expect(caseCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        discrepancyType: PaymentReconciliationDiscrepancyType.STALE_PENDING,
      }),
    );
  });

  it('opens a reconciliation case for a payment without providerRef', async () => {
    const payment = buildPayment({ providerRef: null });
    repository.find.mockResolvedValue([payment]);

    const report = await service.reconcileStalePayments();

    expect(paymentService.handleKonnectWebhook).not.toHaveBeenCalled();
    expect(report.stillPendingCount).toBe(1);
    expect(caseCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        discrepancyType:
          PaymentReconciliationDiscrepancyType.MISSING_PROVIDER_REFERENCE,
      }),
    );
  });

  it('uses signed Paymee webhook evidence without a provider API call', async () => {
    const payment = buildPayment({
      provider: PaymentProviderName.PAYMEE,
      providerRef: 'paymee-token',
      lastProviderStatus: 'true',
    });
    repository.find.mockResolvedValue([payment]);
    repository.findOne.mockResolvedValue(payment);

    const report = await service.reconcileStalePayments();

    expect(paymentService.handleKonnectWebhook).not.toHaveBeenCalled();
    expect(paymentService.handleFlouciWebhook).not.toHaveBeenCalled();
    expect(caseCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        discrepancyType: PaymentReconciliationDiscrepancyType.STATUS_MISMATCH,
        evidenceSource: PaymentReconciliationEvidenceSource.SIGNED_WEBHOOK,
        mappedProviderStatus: PaymentStatus.PAID,
      }),
    );
    expect(report.stillPendingCount).toBe(1);
  });

  it('continues with the next payment when one verification throws', async () => {
    const failing = buildPayment({
      id: 'payment-fail',
      providerRef: 'ref-fail',
    });
    const succeeding = buildPayment({
      id: 'payment-ok',
      providerRef: 'ref-ok',
    });
    repository.find.mockResolvedValue([failing, succeeding]);
    paymentService.handleKonnectWebhook
      .mockRejectedValueOnce(new Error('provider down'))
      .mockResolvedValueOnce(undefined);
    repository.findOne.mockImplementation(async (options) => {
      const id = options.where && 'id' in options.where ? options.where.id : '';
      return id === succeeding.id
        ? { ...succeeding, status: PaymentStatus.PAID }
        : failing;
    });

    const report = await service.reconcileStalePayments();

    expect(paymentService.handleKonnectWebhook).toHaveBeenCalledTimes(2);
    expect(report.staleCount).toBe(2);
    expect(report.resolvedCount).toBe(1);
  });

  it('getLastReport reflects the most recent run', async () => {
    expect(service.getLastReport()).toBeNull();

    await service.reconcileStalePayments();

    expect(service.getLastReport()).not.toBeNull();
  });
});
