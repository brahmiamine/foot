import { NotFoundException } from '@nestjs/common';
import {
  DataSource,
  EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentProviderName } from './enums/payment-provider.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { PAYMENT_PAID_EVENT_TYPE, PaymentService } from './payment.service';
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
import { FlouciProvider } from './providers/flouci/flouci.provider';
import { FlouciPaymentMismatchError } from './providers/flouci/flouci.exceptions';
import { OutboxService } from '../outbox/outbox.service';

describe('PaymentService', () => {
  let repository: jest.Mocked<
    Pick<Repository<Payment>, 'create' | 'save' | 'findOne' | 'update'>
  >;
  let managerQueryBuilder: {
    update: jest.Mock;
    set: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    execute: jest.Mock;
  };
  let manager: { createQueryBuilder: jest.Mock };
  let dataSource: jest.Mocked<Pick<DataSource, 'transaction'>>;
  let konnectProvider: jest.Mocked<
    Pick<KonnectProvider, 'initiatePayment' | 'verifyPayment'>
  >;
  let paymeeProvider: jest.Mocked<
    Pick<PaymeeProvider, 'initiatePayment' | 'verifyChecksum' | 'verifyPayment'>
  >;
  let flouciProvider: jest.Mocked<
    Pick<FlouciProvider, 'initiatePayment' | 'verifyPayment'>
  >;
  let outboxService: jest.Mocked<Pick<OutboxService, 'enqueue'>>;
  let service: PaymentService;

  function buildPayment(overrides: Partial<Payment> = {}): Payment {
    return {
      id: 'payment-1',
      orderId: 'ORDER-1',
      userId: null,
      callerApplication: 'billetterie',
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
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  beforeEach(() => {
    managerQueryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    manager = {
      createQueryBuilder: jest.fn().mockReturnValue(managerQueryBuilder),
    };
    dataSource = {
      transaction: jest
        .fn()
        .mockImplementation(
          (cb: (manager: EntityManager) => Promise<unknown>) =>
            cb(manager as unknown as EntityManager),
        ),
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

    flouciProvider = {
      initiatePayment: jest.fn(),
      verifyPayment: jest.fn(),
    };

    outboxService = { enqueue: jest.fn().mockResolvedValue(undefined) };

    service = new PaymentService(
      repository as unknown as Repository<Payment>,
      dataSource as unknown as DataSource,
      konnectProvider as unknown as KonnectProvider,
      paymeeProvider as unknown as PaymeeProvider,
      flouciProvider as unknown as FlouciProvider,
      outboxService,
    );
  });

  describe('initiateKonnectPayment', () => {
    it('creates a pending payment, then records payUrl and providerRef from Konnect', async () => {
      konnectProvider.initiatePayment.mockResolvedValue({
        payUrl: 'https://gateway.konnect.network/pay/abc',
        providerRef: 'ref-123',
      });

      const result = await service.initiateKonnectPayment(
        {
          orderId: 'ORDER-1',
          amount: 25.5,
          currency: 'TND',
        },
        'billetterie',
      );

      expect(result).toEqual({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        paymentId: expect.any(String),
        payUrl: 'https://gateway.konnect.network/pay/abc',
        providerRef: 'ref-123',
      });
      expect(konnectProvider.initiatePayment).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'ORDER-1',
          amount: 25.5,
          paymentId: result.paymentId,
        }),
      );
      expect(repository.save).toHaveBeenCalledTimes(2);
    });

    it('replays the existing payment instead of re-initiating when the idempotency key is already known (TASK-P0-005)', async () => {
      const existing = buildPayment({
        id: 'payment-existing',
        payUrl: 'https://gateway.konnect.network/pay/existing',
        providerRef: 'ref-existing',
      });
      repository.findOne.mockResolvedValue(existing);

      const result = await service.initiateKonnectPayment(
        { orderId: 'ORDER-1', amount: 25.5, currency: 'TND' },
        'billetterie',
        'retry-key-1',
      );

      expect(result).toEqual({
        paymentId: 'payment-existing',
        payUrl: 'https://gateway.konnect.network/pay/existing',
        providerRef: 'ref-existing',
      });
      expect(repository.findOne).toHaveBeenCalledWith({
        where: {
          callerApplication: 'billetterie',
          idempotencyKey: 'retry-key-1',
        },
      });
      expect(konnectProvider.initiatePayment).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('recovers from a concurrent duplicate-key insert by returning the winner instead of failing (TASK-P0-005)', async () => {
      repository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(
        buildPayment({
          id: 'payment-winner',
          payUrl: 'https://gateway.konnect.network/pay/winner',
          providerRef: 'ref-winner',
        }),
      );
      const duplicateError = Object.assign(new Error('Duplicate entry'), {
        code: 'ER_DUP_ENTRY',
      });
      Object.setPrototypeOf(duplicateError, QueryFailedError.prototype);
      repository.save.mockRejectedValueOnce(duplicateError);

      const result = await service.initiateKonnectPayment(
        { orderId: 'ORDER-1', amount: 25.5, currency: 'TND' },
        'billetterie',
        'retry-key-1',
      );

      expect(result).toEqual({
        paymentId: 'payment-winner',
        payUrl: 'https://gateway.konnect.network/pay/winner',
        providerRef: 'ref-winner',
      });
      expect(konnectProvider.initiatePayment).not.toHaveBeenCalled();
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

    it('marks the payment PAID and enqueues a PAYMENT_PAID outbox event, in the same transaction as the status update', async () => {
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
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(managerQueryBuilder.andWhere).toHaveBeenCalledWith(
        'status != :paid',
        {
          paid: PaymentStatus.PAID,
        },
      );
      expect(outboxService.enqueue).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          eventType: PAYMENT_PAID_EVENT_TYPE,
          aggregateId: payment.id,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          payload: expect.objectContaining({
            paymentId: payment.id,
            orderId: 'ORDER-1',
          }),
        }),
      );
    });

    it('does not enqueue an outbox event when the conditional update affects no row (lost the race)', async () => {
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
      managerQueryBuilder.execute.mockResolvedValue({ affected: 0 });

      await service.handleKonnectWebhook('ref-123');

      expect(outboxService.enqueue).not.toHaveBeenCalled();
    });

    it('updates the payment to PENDING (no outbox event) for a pending payment', async () => {
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
      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(outboxService.enqueue).not.toHaveBeenCalled();
    });

    it('is idempotent: a second webhook for an already-PAID payment is a no-op', async () => {
      const payment = buildPayment({
        status: PaymentStatus.PAID,
        paidAt: new Date(),
      });
      repository.findOne.mockResolvedValue(payment);

      await service.handleKonnectWebhook('ref-123');

      expect(konnectProvider.verifyPayment).not.toHaveBeenCalled();
      expect(outboxService.enqueue).not.toHaveBeenCalled();
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
      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(outboxService.enqueue).not.toHaveBeenCalled();
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

      const result = await service.initiatePaymeePayment(
        {
          orderId: 'ORDER-1',
          amount: 220.25,
          firstName: 'John',
          lastName: 'Doe',
          email: 'test@paymee.tn',
          phoneNumber: '+21611222333',
          mode: PaymeeIntegrationMode.REDIRECT,
        },
        'billetterie',
      );

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

      const result = await service.initiatePaymeePayment(
        {
          orderId: 'ORDER-2',
          amount: 10.5,
          firstName: 'John',
          lastName: 'Doe',
          email: 'test@paymee.tn',
          phoneNumber: '+21611222333',
          mode: PaymeeIntegrationMode.IFRAME,
        },
        'billetterie',
      );

      expect(result.token).toBe('paymee-token-2');
      expect(result.payUrl).toBeUndefined();
    });

    it('replays the existing payment instead of re-initiating when the idempotency key is already known (TASK-P0-005)', async () => {
      const existing = buildPayment({
        id: 'payment-existing',
        provider: PaymentProviderName.PAYMEE,
        providerRef: 'paymee-token-existing',
        payUrl: 'https://sandbox.paymee.tn/gateway/paymee-token-existing',
      });
      repository.findOne.mockResolvedValue(existing);

      const result = await service.initiatePaymeePayment(
        {
          orderId: 'ORDER-1',
          amount: 220.25,
          firstName: 'John',
          lastName: 'Doe',
          email: 'test@paymee.tn',
          phoneNumber: '+21611222333',
          mode: PaymeeIntegrationMode.REDIRECT,
        },
        'billetterie',
        'retry-key-1',
      );

      expect(result).toEqual({
        paymentId: 'payment-existing',
        token: 'paymee-token-existing',
        payUrl: 'https://sandbox.paymee.tn/gateway/paymee-token-existing',
      });
      expect(paymeeProvider.initiatePayment).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
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

    it('marks the payment PAID and enqueues a PAYMENT_PAID outbox event for a successful payment', async () => {
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
      expect(managerQueryBuilder.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PaymentStatus.PAID,
          receivedAmount: '210.250',
          providerFee: '10.000',
        }),
      );
      expect(outboxService.enqueue).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          eventType: PAYMENT_PAID_EVENT_TYPE,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          payload: expect.objectContaining({
            paymentId: payment.id,
            orderId: 'ORDER-1',
          }),
        }),
      );
    });

    it('marks the payment FAILED (no outbox event) for a failed payment', async () => {
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
      expect(outboxService.enqueue).not.toHaveBeenCalled();
    });

    it('is idempotent: a second webhook for an already-PAID payment is a no-op', async () => {
      const payment = buildPaymeePayment({
        status: PaymentStatus.PAID,
        paidAt: new Date(),
      });
      repository.findOne.mockResolvedValue(payment);

      await service.handlePaymeeWebhook(buildPaymeeWebhookPayload());

      expect(paymeeProvider.verifyPayment).not.toHaveBeenCalled();
      expect(outboxService.enqueue).not.toHaveBeenCalled();
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
      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(outboxService.enqueue).not.toHaveBeenCalled();
    });
  });

  describe('initiateFlouciPayment', () => {
    it('creates a pending payment, then records payUrl/providerRef from Flouci, tracked by the internal id', async () => {
      flouciProvider.initiatePayment.mockResolvedValue({
        payUrl: 'https://flouci.com/pay/FoPKKHqfQIKfBqhEj8M47A',
        providerRef: 'FoPKKHqfQIKfBqhEj8M47A',
      });

      const result = await service.initiateFlouciPayment(
        {
          orderId: 'ORDER-1',
          amount: 25.5,
          currency: 'TND',
        },
        'billetterie',
      );

      expect(result).toEqual({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        paymentId: expect.any(String),
        payUrl: 'https://flouci.com/pay/FoPKKHqfQIKfBqhEj8M47A',
        providerRef: 'FoPKKHqfQIKfBqhEj8M47A',
      });
      expect(flouciProvider.initiatePayment).toHaveBeenCalledWith(
        expect.objectContaining({
          trackingId: result.paymentId,
          amount: 25.5,
        }),
      );
      expect(repository.save).toHaveBeenCalledTimes(2);
    });

    it('replays the existing payment instead of re-initiating when the idempotency key is already known (TASK-P0-005)', async () => {
      const existing = buildPayment({
        id: 'payment-existing',
        provider: PaymentProviderName.FLOUCI,
        providerRef: 'FoPKKHqfQIKfBqhEj8M47A',
        payUrl: 'https://flouci.com/pay/FoPKKHqfQIKfBqhEj8M47A',
      });
      repository.findOne.mockResolvedValue(existing);

      const result = await service.initiateFlouciPayment(
        { orderId: 'ORDER-1', amount: 25.5, currency: 'TND' },
        'billetterie',
        'retry-key-1',
      );

      expect(result).toEqual({
        paymentId: 'payment-existing',
        payUrl: 'https://flouci.com/pay/FoPKKHqfQIKfBqhEj8M47A',
        providerRef: 'FoPKKHqfQIKfBqhEj8M47A',
      });
      expect(flouciProvider.initiatePayment).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('handleFlouciWebhook', () => {
    function buildFlouciPayment(overrides: Partial<Payment> = {}): Payment {
      return buildPayment({
        provider: PaymentProviderName.FLOUCI,
        providerRef: 'FoPKKHqfQIKfBqhEj8M47A',
        amount: '25.500',
        payUrl: 'https://flouci.com/pay/FoPKKHqfQIKfBqhEj8M47A',
        ...overrides,
      });
    }

    it('throws NotFoundException when no payment matches the payment_id', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.handleFlouciWebhook('unknown-payment-id'),
      ).rejects.toThrow(NotFoundException);
      expect(flouciProvider.verifyPayment).not.toHaveBeenCalled();
    });

    it('marks the payment PAID and enqueues a PAYMENT_PAID outbox event for a SUCCESS verification', async () => {
      const payment = buildFlouciPayment({ status: PaymentStatus.PENDING });
      repository.findOne.mockResolvedValue(payment);
      flouciProvider.verifyPayment.mockResolvedValue({
        providerStatus: 'SUCCESS',
        internalStatus: PaymentStatus.PAID,
      });

      await service.handleFlouciWebhook('FoPKKHqfQIKfBqhEj8M47A');

      expect(flouciProvider.verifyPayment).toHaveBeenCalledWith(
        'FoPKKHqfQIKfBqhEj8M47A',
        { trackingId: payment.id, amount: '25.500' },
      );
      expect(outboxService.enqueue).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          eventType: PAYMENT_PAID_EVENT_TYPE,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          payload: expect.objectContaining({
            paymentId: payment.id,
            orderId: 'ORDER-1',
          }),
        }),
      );
    });

    it('updates the payment to PENDING (no outbox event) for a PENDING verification', async () => {
      const payment = buildFlouciPayment({ status: PaymentStatus.PENDING });
      repository.findOne.mockResolvedValue(payment);
      flouciProvider.verifyPayment.mockResolvedValue({
        providerStatus: 'PENDING',
        internalStatus: PaymentStatus.PENDING,
      });

      await service.handleFlouciWebhook('FoPKKHqfQIKfBqhEj8M47A');

      expect(repository.update).toHaveBeenCalledWith(
        payment.id,
        expect.objectContaining({
          status: PaymentStatus.PENDING,
          lastProviderStatus: 'PENDING',
        }),
      );
      expect(outboxService.enqueue).not.toHaveBeenCalled();
    });

    it('updates the payment to EXPIRED for an EXPIRED verification', async () => {
      const payment = buildFlouciPayment({ status: PaymentStatus.PENDING });
      repository.findOne.mockResolvedValue(payment);
      flouciProvider.verifyPayment.mockResolvedValue({
        providerStatus: 'EXPIRED',
        internalStatus: PaymentStatus.EXPIRED,
      });

      await service.handleFlouciWebhook('FoPKKHqfQIKfBqhEj8M47A');

      expect(repository.update).toHaveBeenCalledWith(
        payment.id,
        expect.objectContaining({ status: PaymentStatus.EXPIRED }),
      );
      expect(outboxService.enqueue).not.toHaveBeenCalled();
    });

    it('updates the payment to FAILED for a FAILURE verification', async () => {
      const payment = buildFlouciPayment({ status: PaymentStatus.PENDING });
      repository.findOne.mockResolvedValue(payment);
      flouciProvider.verifyPayment.mockResolvedValue({
        providerStatus: 'FAILURE',
        internalStatus: PaymentStatus.FAILED,
      });

      await service.handleFlouciWebhook('FoPKKHqfQIKfBqhEj8M47A');

      expect(repository.update).toHaveBeenCalledWith(
        payment.id,
        expect.objectContaining({ status: PaymentStatus.FAILED }),
      );
      expect(outboxService.enqueue).not.toHaveBeenCalled();
    });

    it('is idempotent: a second webhook for an already-PAID payment is a no-op and skips verify_payment', async () => {
      const payment = buildFlouciPayment({
        status: PaymentStatus.PAID,
        paidAt: new Date(),
      });
      repository.findOne.mockResolvedValue(payment);

      await service.handleFlouciWebhook('FoPKKHqfQIKfBqhEj8M47A');

      expect(flouciProvider.verifyPayment).not.toHaveBeenCalled();
      expect(outboxService.enqueue).not.toHaveBeenCalled();
    });

    it('always records the webhook delivery, even before checking idempotency', async () => {
      const payment = buildFlouciPayment({ status: PaymentStatus.PAID });
      repository.findOne.mockResolvedValue(payment);

      await service.handleFlouciWebhook('FoPKKHqfQIKfBqhEj8M47A');

      expect(repository.update).toHaveBeenCalledWith(
        payment.id,
        expect.objectContaining({ webhookReceivedCount: 1 }),
      );
    });

    it('propagates a mismatch and never flips the payment to PAID', async () => {
      const payment = buildFlouciPayment({ status: PaymentStatus.PENDING });
      repository.findOne.mockResolvedValue(payment);
      flouciProvider.verifyPayment.mockRejectedValue(
        new FlouciPaymentMismatchError('amount mismatch'),
      );

      await expect(
        service.handleFlouciWebhook('FoPKKHqfQIKfBqhEj8M47A'),
      ).rejects.toThrow(FlouciPaymentMismatchError);
      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(outboxService.enqueue).not.toHaveBeenCalled();
    });
  });
});
