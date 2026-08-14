import { PaymentStatus } from '../../enums/payment-status.enum';
import { computePaymeeChecksum } from './paymee.checksum';
import { PaymeeClient } from './paymee.client';
import {
  PaymeeChecksumInvalidError,
  PaymeePaymentMismatchError,
} from './paymee.exceptions';
import { PaymeeProvider } from './paymee.provider';
import { PaymeeWebhookPayload } from './paymee.types';

describe('PaymeeProvider', () => {
  const config = {
    baseUrl: 'https://sandbox.paymee.tn/api/v2',
    apiKey: 'test-api-key',
    webhookUrl:
      'https://payments.example.com/payments/providers/paymee/webhook',
    returnUrl: 'https://example.com/payment/return',
    cancelUrl: 'https://example.com/payment/cancel',
  };

  let client: jest.Mocked<Pick<PaymeeClient, 'createPayment'>>;
  let provider: PaymeeProvider;

  beforeEach(() => {
    client = { createPayment: jest.fn() };
    provider = new PaymeeProvider(client as unknown as PaymeeClient, config);
  });

  describe('initiatePayment', () => {
    it('builds the request from internal data and returns token/payUrl', async () => {
      client.createPayment.mockResolvedValue({
        token: 'dfe54df34b54df3a854f3a53fc85a',
        order_id: '244557',
        amount: 220.25,
        payment_url:
          'https://sandbox.paymee.tn/gateway/dfe54df34b54df3a854f3a53fc85a',
      });

      const result = await provider.initiatePayment({
        orderId: 'ORDER-1',
        amount: 220.25,
        firstName: 'John',
        lastName: 'Doe',
        email: 'test@paymee.tn',
        phoneNumber: '+21611222333',
      });

      expect(result).toEqual({
        token: 'dfe54df34b54df3a854f3a53fc85a',
        payUrl:
          'https://sandbox.paymee.tn/gateway/dfe54df34b54df3a854f3a53fc85a',
      });
      expect(client.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 220.25,
          note: 'Order #ORDER-1',
          first_name: 'John',
          last_name: 'Doe',
          email: 'test@paymee.tn',
          phone: '+21611222333',
          webhook_url: config.webhookUrl,
        }),
      );
    });
  });

  describe('verifyChecksum', () => {
    it('does not throw for a valid checksum', () => {
      const checksum = computePaymeeChecksum('token-123', true, config.apiKey);
      expect(() =>
        provider.verifyChecksum('token-123', true, checksum),
      ).not.toThrow();
    });

    it('throws PaymeeChecksumInvalidError for an invalid checksum', () => {
      expect(() =>
        provider.verifyChecksum('token-123', true, 'wrong-checksum'),
      ).toThrow(PaymeeChecksumInvalidError);
    });

    it('throws PaymeeChecksumInvalidError when the checksum was computed with the wrong API key', () => {
      const checksum = computePaymeeChecksum(
        'token-123',
        true,
        'a-different-api-key',
      );
      expect(() =>
        provider.verifyChecksum('token-123', true, checksum),
      ).toThrow(PaymeeChecksumInvalidError);
    });
  });

  describe('verifyPayment', () => {
    const basePayload: PaymeeWebhookPayload = {
      token: 'token-123',
      check_sum: 'checksum',
      payment_status: true,
      order_id: 'ORDER-1',
      amount: 220.25,
    };

    it('returns PAID for a matching successful payment', () => {
      const result = provider.verifyPayment(basePayload, {
        orderId: 'ORDER-1',
        amount: '220.250',
      });

      expect(result.internalStatus).toBe(PaymentStatus.PAID);
      expect(result.providerStatus).toBe('true');
    });

    it('returns FAILED for a matching failed payment', () => {
      const result = provider.verifyPayment(
        { ...basePayload, payment_status: false },
        { orderId: 'ORDER-1', amount: '220.250' },
      );

      expect(result.internalStatus).toBe(PaymentStatus.FAILED);
      expect(result.providerStatus).toBe('false');
    });

    it('carries received_amount/cost through when present, without touching amount semantics', () => {
      const result = provider.verifyPayment(
        { ...basePayload, received_amount: 210.25, cost: 10 },
        { orderId: 'ORDER-1', amount: '220.250' },
      );

      expect(result.receivedAmount).toBe('210.25');
      expect(result.fee).toBe('10.00');
    });

    it('throws PaymeePaymentMismatchError when the amount does not match', () => {
      expect(() =>
        provider.verifyPayment(basePayload, {
          orderId: 'ORDER-1',
          amount: '200.25',
        }),
      ).toThrow(PaymeePaymentMismatchError);
    });

    it('throws PaymeePaymentMismatchError when the order_id does not match', () => {
      expect(() =>
        provider.verifyPayment(basePayload, {
          orderId: 'ORDER-OTHER',
          amount: '220.25',
        }),
      ).toThrow(PaymeePaymentMismatchError);
    });
  });
});
