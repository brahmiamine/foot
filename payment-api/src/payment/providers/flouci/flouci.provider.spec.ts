import { PaymentStatus } from '../../enums/payment-status.enum';
import { FlouciClient } from './flouci.client';
import { FlouciPaymentMismatchError } from './flouci.exceptions';
import { FlouciProvider } from './flouci.provider';

describe('FlouciProvider', () => {
  const config = {
    baseUrl: 'https://developers.flouci.com',
    publicKey: 'test-public-key',
    privateKey: 'test-private-key',
    webhookUrl:
      'https://payment-api.example.com/payments/providers/flouci/webhook',
    successUrl: 'https://example.com/payment/success',
    failUrl: 'https://example.com/payment/fail',
  };

  let client: jest.Mocked<
    Pick<FlouciClient, 'generatePayment' | 'verifyPayment'>
  >;
  let provider: FlouciProvider;

  beforeEach(() => {
    client = {
      generatePayment: jest.fn(),
      verifyPayment: jest.fn(),
    };
    provider = new FlouciProvider(client as unknown as FlouciClient, config);
  });

  describe('initiatePayment', () => {
    it('maps the amount to millimes and returns payUrl/providerRef', async () => {
      client.generatePayment.mockResolvedValue({
        success: true,
        payment_id: 'FoPKKHqfQIKfBqhEj8M47A',
        link: 'https://flouci.com/pay/FoPKKHqfQIKfBqhEj8M47A',
        developer_tracking_id: 'payment-123',
      });

      const result = await provider.initiatePayment({
        trackingId: 'payment-123',
        amount: 25.5,
      });

      expect(result).toEqual({
        payUrl: 'https://flouci.com/pay/FoPKKHqfQIKfBqhEj8M47A',
        providerRef: 'FoPKKHqfQIKfBqhEj8M47A',
      });
      expect(client.generatePayment).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 25500,
          developer_tracking_id: 'payment-123',
          webhook: config.webhookUrl,
        }),
      );
    });

    it('throws FlouciPaymentMismatchError when Flouci echoes back a different developer_tracking_id', async () => {
      client.generatePayment.mockResolvedValue({
        success: true,
        payment_id: 'FoPKKHqfQIKfBqhEj8M47A',
        link: 'https://flouci.com/pay/FoPKKHqfQIKfBqhEj8M47A',
        developer_tracking_id: 'a-different-tracking-id',
      });

      await expect(
        provider.initiatePayment({ trackingId: 'payment-123', amount: 25.5 }),
      ).rejects.toThrow(FlouciPaymentMismatchError);
    });
  });

  describe('verifyPayment', () => {
    it('returns PAID for a matching SUCCESS verification', async () => {
      client.verifyPayment.mockResolvedValue({
        success: true,
        result: {
          amount: 25500,
          status: 'SUCCESS',
          developer_tracking_id: 'payment-123',
        },
      });

      const result = await provider.verifyPayment('FoPKKHqfQIKfBqhEj8M47A', {
        trackingId: 'payment-123',
        amount: '25.500',
      });

      expect(result.internalStatus).toBe(PaymentStatus.PAID);
      expect(result.providerStatus).toBe('SUCCESS');
    });

    it('returns PENDING for a matching PENDING verification', async () => {
      client.verifyPayment.mockResolvedValue({
        success: true,
        result: {
          amount: 25500,
          status: 'PENDING',
          developer_tracking_id: 'payment-123',
        },
      });

      const result = await provider.verifyPayment('FoPKKHqfQIKfBqhEj8M47A', {
        trackingId: 'payment-123',
        amount: '25.500',
      });

      expect(result.internalStatus).toBe(PaymentStatus.PENDING);
    });

    it('returns EXPIRED for a matching EXPIRED verification', async () => {
      client.verifyPayment.mockResolvedValue({
        success: true,
        result: {
          amount: 25500,
          status: 'EXPIRED',
          developer_tracking_id: 'payment-123',
        },
      });

      const result = await provider.verifyPayment('FoPKKHqfQIKfBqhEj8M47A', {
        trackingId: 'payment-123',
        amount: '25.500',
      });

      expect(result.internalStatus).toBe(PaymentStatus.EXPIRED);
    });

    it('returns FAILED for a matching FAILURE verification', async () => {
      client.verifyPayment.mockResolvedValue({
        success: true,
        result: {
          amount: 25500,
          status: 'FAILURE',
          developer_tracking_id: 'payment-123',
        },
      });

      const result = await provider.verifyPayment('FoPKKHqfQIKfBqhEj8M47A', {
        trackingId: 'payment-123',
        amount: '25.500',
      });

      expect(result.internalStatus).toBe(PaymentStatus.FAILED);
    });

    it('never treats a SUCCESS status as PAID when success !== true', async () => {
      client.verifyPayment.mockResolvedValue({
        success: false,
        result: {
          amount: 25500,
          status: 'SUCCESS',
          developer_tracking_id: 'payment-123',
        },
      });

      const result = await provider.verifyPayment('FoPKKHqfQIKfBqhEj8M47A', {
        trackingId: 'payment-123',
        amount: '25.500',
      });

      expect(result.internalStatus).toBe(PaymentStatus.UNKNOWN);
    });

    it('throws FlouciPaymentMismatchError when the amount does not match', async () => {
      client.verifyPayment.mockResolvedValue({
        success: true,
        result: {
          amount: 10000,
          status: 'SUCCESS',
          developer_tracking_id: 'payment-123',
        },
      });

      await expect(
        provider.verifyPayment('FoPKKHqfQIKfBqhEj8M47A', {
          trackingId: 'payment-123',
          amount: '25.500',
        }),
      ).rejects.toThrow(FlouciPaymentMismatchError);
    });

    it('throws FlouciPaymentMismatchError when the developer_tracking_id does not match', async () => {
      client.verifyPayment.mockResolvedValue({
        success: true,
        result: {
          amount: 25500,
          status: 'SUCCESS',
          developer_tracking_id: 'a-different-payment',
        },
      });

      await expect(
        provider.verifyPayment('FoPKKHqfQIKfBqhEj8M47A', {
          trackingId: 'payment-123',
          amount: '25.500',
        }),
      ).rejects.toThrow(FlouciPaymentMismatchError);
    });
  });
});
