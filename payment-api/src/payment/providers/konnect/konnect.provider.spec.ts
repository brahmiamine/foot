import { PaymentStatus } from '../../enums/payment-status.enum';
import { KonnectClient } from './konnect.client';
import { KonnectPaymentMismatchError } from './konnect.exceptions';
import { KonnectProvider } from './konnect.provider';

describe('KonnectProvider', () => {
  const config = {
    baseUrl: 'https://api.sandbox.konnect.network/api/v2',
    apiKey: 'test-api-key',
    walletId: 'wallet-123',
    webhookUrl: 'https://payment-api.example.com/payments/konnect/webhook',
  };

  let client: jest.Mocked<
    Pick<KonnectClient, 'initPayment' | 'getPaymentDetails'>
  >;
  let provider: KonnectProvider;

  beforeEach(() => {
    client = {
      initPayment: jest.fn(),
      getPaymentDetails: jest.fn(),
    };
    provider = new KonnectProvider(client as unknown as KonnectClient, config);
  });

  describe('initiatePayment', () => {
    it('maps the amount to millimes and returns payUrl/providerRef', async () => {
      client.initPayment.mockResolvedValue({
        payUrl: 'https://gateway.konnect.network/pay/abc',
        paymentRef: 'ref-123',
      });

      const result = await provider.initiatePayment({
        orderId: 'ORDER-1',
        amount: 25.5,
        email: 'amine@example.com',
      });

      expect(result).toEqual({
        payUrl: 'https://gateway.konnect.network/pay/abc',
        providerRef: 'ref-123',
      });
      expect(client.initPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          receiverWalletId: 'wallet-123',
          amount: 25500,
          orderId: 'ORDER-1',
          email: 'amine@example.com',
          webhook: config.webhookUrl,
        }),
      );
    });
  });

  describe('verifyPayment', () => {
    it('returns PAID for a completed, matching payment', async () => {
      client.getPaymentDetails.mockResolvedValue({
        payment: {
          id: 'pay_1',
          status: 'completed',
          amountDue: 25500,
          reachedAmount: 25500,
          amount: 25500,
          token: 'TND',
          orderId: 'ORDER-1',
        },
      });

      const result = await provider.verifyPayment('ref-123', {
        orderId: 'ORDER-1',
        amount: '25.500',
        currency: 'TND',
      });

      expect(result.internalStatus).toBe(PaymentStatus.PAID);
      expect(result.providerStatus).toBe('completed');
    });

    it('returns PENDING for a pending, matching payment', async () => {
      client.getPaymentDetails.mockResolvedValue({
        payment: {
          id: 'pay_1',
          status: 'pending',
          amountDue: 25500,
          reachedAmount: 0,
          amount: 25500,
          token: 'TND',
          orderId: 'ORDER-1',
        },
      });

      const result = await provider.verifyPayment('ref-123', {
        orderId: 'ORDER-1',
        amount: '25.500',
        currency: 'TND',
      });

      expect(result.internalStatus).toBe(PaymentStatus.PENDING);
    });

    it('throws KonnectPaymentMismatchError when the amount does not match', async () => {
      client.getPaymentDetails.mockResolvedValue({
        payment: {
          id: 'pay_1',
          status: 'completed',
          amountDue: 10000,
          reachedAmount: 10000,
          amount: 10000,
          token: 'TND',
          orderId: 'ORDER-1',
        },
      });

      await expect(
        provider.verifyPayment('ref-123', {
          orderId: 'ORDER-1',
          amount: '25.500',
          currency: 'TND',
        }),
      ).rejects.toThrow(KonnectPaymentMismatchError);
    });
  });
});
