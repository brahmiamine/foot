import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentProviderName } from './enums/payment-provider.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { PAYMENT_PAID_EVENT, PaymentService } from './payment.service';
import { KonnectPaymentMismatchError } from './providers/konnect/konnect.exceptions';
import { KonnectProvider } from './providers/konnect/konnect.provider';

describe('PaymentService', () => {
  let repository: jest.Mocked<
    Pick<
      Repository<Payment>,
      'create' | 'save' | 'findOne' | 'update' | 'createQueryBuilder'
    >
  >;
  let queryBuilder: {
    update: jest.Mock;
    set: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    execute: jest.Mock;
  };
  let konnectProvider: jest.Mocked<
    Pick<KonnectProvider, 'initiatePayment' | 'verifyPayment'>
  >;
  let eventEmitter: jest.Mocked<Pick<EventEmitter2, 'emit'>>;
  let service: PaymentService;

  function buildPayment(overrides: Partial<Payment> = {}): Payment {
    return {
      id: 'payment-1',
      orderId: 'ORDER-1',
      provider: PaymentProviderName.KONNECT,
      amount: '25.500',
      currency: 'TND',
      status: PaymentStatus.PENDING,
      providerRef: 'ref-123',
      payUrl: 'https://gateway.konnect.network/pay/abc',
      lastProviderStatus: null,
      paidAt: null,
      lastWebhookAt: null,
      webhookReceivedCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  beforeEach(() => {
    queryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    repository = {
      create: jest.fn((data) => data as Payment),
      save: jest.fn((payment: Payment) => {
        if (!payment.id) {
          payment.id = 'generated-id';
        }
        return Promise.resolve(payment);
      }),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    konnectProvider = {
      initiatePayment: jest.fn(),
      verifyPayment: jest.fn(),
    };

    eventEmitter = { emit: jest.fn() };

    service = new PaymentService(
      repository as unknown as Repository<Payment>,
      konnectProvider as unknown as KonnectProvider,
      eventEmitter as unknown as EventEmitter2,
    );
  });

  describe('initiateKonnectPayment', () => {
    it('creates a pending payment, then records payUrl and providerRef from Konnect', async () => {
      konnectProvider.initiatePayment.mockResolvedValue({
        payUrl: 'https://gateway.konnect.network/pay/abc',
        providerRef: 'ref-123',
      });

      const result = await service.initiateKonnectPayment({
        orderId: 'ORDER-1',
        amount: 25.5,
        currency: 'TND',
      });

      expect(result).toEqual({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        paymentId: expect.any(String),
        payUrl: 'https://gateway.konnect.network/pay/abc',
        providerRef: 'ref-123',
      });
      expect(konnectProvider.initiatePayment).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: 'ORDER-1', amount: 25.5 }),
      );
      expect(repository.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('handleKonnectWebhook', () => {
    it('throws NotFoundException when no payment matches the payment_ref', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.handleKonnectWebhook('unknown-ref')).rejects.toThrow(
        NotFoundException,
      );
      expect(konnectProvider.verifyPayment).not.toHaveBeenCalled();
    });

    it('marks the payment PAID and emits payment.paid for a completed payment', async () => {
      const payment = buildPayment({ status: PaymentStatus.PENDING });
      repository.findOne.mockResolvedValue(payment);
      konnectProvider.verifyPayment.mockResolvedValue({
        providerStatus: 'completed',
        internalStatus: PaymentStatus.PAID,
        details: {
          id: 'pay_1',
          status: 'completed',
          amountDue: 25500,
          reachedAmount: 25500,
          amount: 25500,
          token: 'TND',
          orderId: 'ORDER-1',
        },
      });

      await service.handleKonnectWebhook('ref-123');

      expect(konnectProvider.verifyPayment).toHaveBeenCalledWith('ref-123', {
        orderId: 'ORDER-1',
        amount: '25.500',
        currency: 'TND',
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('status != :paid', {
        paid: PaymentStatus.PAID,
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        PAYMENT_PAID_EVENT,
        expect.objectContaining({ paymentId: payment.id, orderId: 'ORDER-1' }),
      );
    });

    it('updates the payment to PENDING (no event) for a pending payment', async () => {
      const payment = buildPayment({ status: PaymentStatus.PENDING });
      repository.findOne.mockResolvedValue(payment);
      konnectProvider.verifyPayment.mockResolvedValue({
        providerStatus: 'pending',
        internalStatus: PaymentStatus.PENDING,
        details: {
          id: 'pay_1',
          status: 'pending',
          amountDue: 25500,
          reachedAmount: 0,
          amount: 25500,
          token: 'TND',
          orderId: 'ORDER-1',
        },
      });

      await service.handleKonnectWebhook('ref-123');

      expect(repository.update).toHaveBeenCalledWith(
        payment.id,
        expect.objectContaining({
          status: PaymentStatus.PENDING,
          lastProviderStatus: 'pending',
        }),
      );
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('is idempotent: a second webhook for an already-PAID payment is a no-op', async () => {
      const payment = buildPayment({
        status: PaymentStatus.PAID,
        paidAt: new Date(),
      });
      repository.findOne.mockResolvedValue(payment);

      await service.handleKonnectWebhook('ref-123');

      expect(konnectProvider.verifyPayment).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('propagates a mismatch and never flips the payment to PAID', async () => {
      const payment = buildPayment({ status: PaymentStatus.PENDING });
      repository.findOne.mockResolvedValue(payment);
      konnectProvider.verifyPayment.mockRejectedValue(
        new KonnectPaymentMismatchError('amount mismatch'),
      );

      await expect(service.handleKonnectWebhook('ref-123')).rejects.toThrow(
        KonnectPaymentMismatchError,
      );
      expect(queryBuilder.execute).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('always records the webhook delivery, even before checking idempotency', async () => {
      const payment = buildPayment({ status: PaymentStatus.PAID });
      repository.findOne.mockResolvedValue(payment);

      await service.handleKonnectWebhook('ref-123');

      expect(repository.update).toHaveBeenCalledWith(
        payment.id,
        expect.objectContaining({ webhookReceivedCount: 1 }),
      );
    });
  });
});
