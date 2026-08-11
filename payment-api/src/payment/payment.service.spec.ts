import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentProviderName } from './enums/payment-provider.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { PAYMENT_PAID_EVENT, PaymentService } from './payment.service';
import { KonnectPaymentMismatchError } from './providers/konnect/konnect.exceptions';
import { KonnectProvider } from './providers/konnect/konnect.provider';
import { PaymeeIntegrationMode } from './providers/paymee/dto/init-paymee-payment.dto';
import {
  PaymeeChecksumInvalidError,
  PaymeePaymentMismatchError,
  PaymeePaymentNotFoundError,
} from './providers/paymee/paymee.exceptions';
import { PaymeeProvider } from './providers/paymee/paymee.provider';
import { PaymeeWebhookPayload } from './providers/paymee/paymee.types';

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
  let paymeeProvider: jest.Mocked<
    Pick<PaymeeProvider, 'initiatePayment' | 'verifyChecksum' | 'verifyPayment'>
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
      receivedAmount: null,
      providerFee: null,
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

    paymeeProvider = {
      initiatePayment: jest.fn(),
      verifyChecksum: jest.fn(),
      verifyPayment: jest.fn(),
    };

    eventEmitter = { emit: jest.fn() };

    service = new PaymentService(
      repository as unknown as Repository<Payment>,
      konnectProvider as unknown as KonnectProvider,
      paymeeProvider as unknown as PaymeeProvider,
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

  describe('initiatePaymeePayment', () => {
    it('creates a pending payment, then records token/payUrl from Paymee (redirect mode)', async () => {
      paymeeProvider.initiatePayment.mockResolvedValue({
        token: 'paymee-token-1',
        payUrl: 'https://sandbox.paymee.tn/gateway/paymee-token-1',
      });

      const result = await service.initiatePaymeePayment({
        orderId: 'ORDER-1',
        amount: 220.25,
        firstName: 'John',
        lastName: 'Doe',
        email: 'test@paymee.tn',
        phoneNumber: '+21611222333',
        mode: PaymeeIntegrationMode.REDIRECT,
      });

      expect(result).toEqual({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        paymentId: expect.any(String),
        token: 'paymee-token-1',
        payUrl: 'https://sandbox.paymee.tn/gateway/paymee-token-1',
      });
      expect(repository.save).toHaveBeenCalledTimes(2);
    });

    it('omits payUrl from the result in iframe (without-redirection) mode', async () => {
      paymeeProvider.initiatePayment.mockResolvedValue({
        token: 'paymee-token-2',
        payUrl: 'https://sandbox.paymee.tn/gateway/paymee-token-2',
      });

      const result = await service.initiatePaymeePayment({
        orderId: 'ORDER-2',
        amount: 10.5,
        firstName: 'John',
        lastName: 'Doe',
        email: 'test@paymee.tn',
        phoneNumber: '+21611222333',
        mode: PaymeeIntegrationMode.IFRAME,
      });

      expect(result.token).toBe('paymee-token-2');
      expect(result.payUrl).toBeUndefined();
    });
  });

  describe('handlePaymeeWebhook', () => {
    function buildPaymeeWebhookPayload(
      overrides: Partial<PaymeeWebhookPayload> = {},
    ): PaymeeWebhookPayload {
      return {
        token: 'token-123',
        check_sum: 'checksum-value',
        payment_status: true,
        order_id: 'ORDER-1',
        amount: 220.25,
        ...overrides,
      };
    }

    function buildPaymeePayment(overrides: Partial<Payment> = {}): Payment {
      return buildPayment({
        provider: PaymentProviderName.PAYMEE,
        providerRef: 'token-123',
        amount: '220.250',
        payUrl: 'https://sandbox.paymee.tn/gateway/token-123',
        ...overrides,
      });
    }

    it('rejects the webhook when the checksum is invalid, before any lookup', async () => {
      paymeeProvider.verifyChecksum.mockImplementation(() => {
        throw new PaymeeChecksumInvalidError();
      });

      await expect(
        service.handlePaymeeWebhook(buildPaymeeWebhookPayload()),
      ).rejects.toThrow(PaymeeChecksumInvalidError);
      expect(repository.findOne).not.toHaveBeenCalled();
    });

    it('throws PaymeePaymentNotFoundError when no payment matches the token', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.handlePaymeeWebhook(buildPaymeeWebhookPayload()),
      ).rejects.toThrow(PaymeePaymentNotFoundError);
      expect(paymeeProvider.verifyPayment).not.toHaveBeenCalled();
    });

    it('marks the payment PAID and emits payment.paid for a successful payment', async () => {
      const payment = buildPaymeePayment({ status: PaymentStatus.PENDING });
      repository.findOne.mockResolvedValue(payment);
      paymeeProvider.verifyPayment.mockReturnValue({
        internalStatus: PaymentStatus.PAID,
        providerStatus: 'true',
        receivedAmount: '210.250',
        fee: '10.000',
      });

      await service.handlePaymeeWebhook(
        buildPaymeeWebhookPayload({
          received_amount: 210.25,
          cost: 10,
        }),
      );

      expect(paymeeProvider.verifyChecksum).toHaveBeenCalledWith(
        'token-123',
        true,
        'checksum-value',
      );
      expect(queryBuilder.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PaymentStatus.PAID,
          receivedAmount: '210.250',
          providerFee: '10.000',
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        PAYMENT_PAID_EVENT,
        expect.objectContaining({ paymentId: payment.id, orderId: 'ORDER-1' }),
      );
    });

    it('marks the payment FAILED (no event) for a failed payment', async () => {
      const payment = buildPaymeePayment({ status: PaymentStatus.PENDING });
      repository.findOne.mockResolvedValue(payment);
      paymeeProvider.verifyPayment.mockReturnValue({
        internalStatus: PaymentStatus.FAILED,
        providerStatus: 'false',
      });

      await service.handlePaymeeWebhook(
        buildPaymeeWebhookPayload({ payment_status: false }),
      );

      expect(repository.update).toHaveBeenCalledWith(
        payment.id,
        expect.objectContaining({
          status: PaymentStatus.FAILED,
          lastProviderStatus: 'false',
        }),
      );
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('is idempotent: a second webhook for an already-PAID payment is a no-op', async () => {
      const payment = buildPaymeePayment({
        status: PaymentStatus.PAID,
        paidAt: new Date(),
      });
      repository.findOne.mockResolvedValue(payment);

      await service.handlePaymeeWebhook(buildPaymeeWebhookPayload());

      expect(paymeeProvider.verifyPayment).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('always records the webhook delivery, even before checking idempotency', async () => {
      const payment = buildPaymeePayment({ status: PaymentStatus.PAID });
      repository.findOne.mockResolvedValue(payment);

      await service.handlePaymeeWebhook(buildPaymeeWebhookPayload());

      expect(repository.update).toHaveBeenCalledWith(
        payment.id,
        expect.objectContaining({ webhookReceivedCount: 1 }),
      );
    });

    it('propagates an amount/order mismatch and never flips the payment to PAID', async () => {
      const payment = buildPaymeePayment({ status: PaymentStatus.PENDING });
      repository.findOne.mockResolvedValue(payment);
      paymeeProvider.verifyPayment.mockImplementation(() => {
        throw new PaymeePaymentMismatchError('amount mismatch');
      });

      await expect(
        service.handlePaymeeWebhook(buildPaymeeWebhookPayload({ amount: 1 })),
      ).rejects.toThrow(PaymeePaymentMismatchError);
      expect(queryBuilder.execute).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });
});
