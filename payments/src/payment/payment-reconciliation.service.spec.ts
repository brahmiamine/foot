import { Repository } from 'typeorm';
import { PaymentReconciliationService } from './payment-reconciliation.service';
import { Payment } from './entities/payment.entity';
import { PaymentStatus } from './enums/payment-status.enum';
import { PaymentProviderName } from './enums/payment-provider.enum';
import { PaymentService } from './payment.service';

describe('PaymentReconciliationService', () => {
  let repository: jest.Mocked<Pick<Repository<Payment>, 'find' | 'findOne'>>;
  let paymentService: jest.Mocked<
    Pick<PaymentService, 'handleKonnectWebhook' | 'handleFlouciWebhook'>
  >;
  let service: PaymentReconciliationService;

  function buildPayment(overrides: Partial<Payment> = {}): Payment {
    return {
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
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2h ago, stale
      updatedAt: new Date(),
      ...overrides,
    };
  }

  beforeEach(() => {
    repository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    };
    paymentService = {
      handleKonnectWebhook: jest.fn().mockResolvedValue(undefined),
      handleFlouciWebhook: jest.fn().mockResolvedValue(undefined),
    };
    service = new PaymentReconciliationService(
      repository as unknown as Repository<Payment>,
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
  });

  it('skips a payment without providerRef (never actually reached the provider)', async () => {
    const payment = buildPayment({ providerRef: null });
    repository.find.mockResolvedValue([payment]);

    const report = await service.reconcileStalePayments();

    expect(paymentService.handleKonnectWebhook).not.toHaveBeenCalled();
    expect(report.stillPendingCount).toBe(1);
  });

  it('never queries Paymee payments (no server-to-server status check available)', async () => {
    await service.reconcileStalePayments();

    const [[query]] = repository.find.mock.calls;
    const providerFilter = (
      query as unknown as {
        where: { provider: { value: PaymentProviderName[] } };
      }
    ).where.provider;
    expect(providerFilter.value).toEqual([
      PaymentProviderName.KONNECT,
      PaymentProviderName.FLOUCI,
    ]);
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
    repository.findOne.mockResolvedValue({
      ...succeeding,
      status: PaymentStatus.PAID,
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
