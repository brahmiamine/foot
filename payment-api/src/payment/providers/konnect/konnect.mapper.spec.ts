import { PaymentStatus } from '../../enums/payment-status.enum';
import {
  KonnectInvalidAmountError,
  KonnectPaymentMismatchError,
} from './konnect.exceptions';
import {
  assertKonnectPaymentMatchesInternalRecord,
  buildKonnectInitPaymentRequest,
  mapKonnectStatus,
  millimesToTnd,
  tndToMillimes,
} from './konnect.mapper';
import { KonnectPaymentDetails } from './konnect.types';

describe('konnect.mapper', () => {
  describe('tndToMillimes', () => {
    it('converts whole and fractional TND amounts deterministically', () => {
      expect(tndToMillimes(25.5)).toBe(25500);
      expect(tndToMillimes(10)).toBe(10000);
      expect(tndToMillimes(1.5)).toBe(1500);
      expect(tndToMillimes('25.500')).toBe(25500);
      expect(tndToMillimes('10.000')).toBe(10000);
      expect(tndToMillimes('1.500')).toBe(1500);
    });

    it('is immune to classic binary floating-point rounding errors', () => {
      // 0.1 + 0.2 famously is not exactly 0.3 in IEEE754.
      expect(tndToMillimes((0.1 + 0.2).toString().slice(0, 3))).toBe(300);
      expect(tndToMillimes(19.999)).toBe(19999);
      expect(tndToMillimes(0.001)).toBe(1);
    });

    it('rejects zero or negative amounts', () => {
      expect(() => tndToMillimes(0)).toThrow(KonnectInvalidAmountError);
      expect(() => tndToMillimes(-1.5)).toThrow(KonnectInvalidAmountError);
    });

    it('rejects malformed amount strings', () => {
      expect(() => tndToMillimes('abc')).toThrow(KonnectInvalidAmountError);
      expect(() => tndToMillimes('1.2.3')).toThrow(KonnectInvalidAmountError);
    });
  });

  describe('millimesToTnd', () => {
    it('is the inverse of tndToMillimes', () => {
      expect(millimesToTnd(25500)).toBe('25.500');
      expect(millimesToTnd(1500)).toBe('1.500');
      expect(millimesToTnd(1)).toBe('0.001');
    });
  });

  describe('buildKonnectInitPaymentRequest', () => {
    it('whitelists only the expected fields and never leaks unrelated data', () => {
      const request = buildKonnectInitPaymentRequest(
        {
          orderId: 'ORDER-1',
          amount: 25.5,
          firstName: 'Amine',
          lastName: 'Brahmi',
          email: 'amine@example.com',
          phoneNumber: '20000000',
          paymentId: 'payment-uuid-1',
        },
        {
          baseUrl: 'https://api.sandbox.konnect.network/api/v2',
          apiKey: 'super-secret-key',
          walletId: 'wallet-123',
          webhookUrl:
            'https://payment-api.example.com/payments/konnect/webhook',
          successUrl: 'https://payment-api.example.com/payment/success',
          failUrl: 'https://payment-api.example.com/payment/fail',
        },
      );

      expect(request).toEqual({
        receiverWalletId: 'wallet-123',
        amount: 25500,
        token: 'TND',
        orderId: 'ORDER-1',
        firstName: 'Amine',
        lastName: 'Brahmi',
        email: 'amine@example.com',
        phoneNumber: '20000000',
        webhook: 'https://payment-api.example.com/payments/konnect/webhook',
        successUrl:
          'https://payment-api.example.com/payment/success?paymentId=payment-uuid-1',
        failUrl:
          'https://payment-api.example.com/payment/fail?paymentId=payment-uuid-1',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        lifespan: expect.any(Number),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        acceptedPaymentMethods: expect.any(Array),
      });
      expect(JSON.stringify(request)).not.toContain('super-secret-key');
    });

    it('omits successUrl/failUrl when not configured, instead of sending a query-string-only URL', () => {
      const request = buildKonnectInitPaymentRequest(
        {
          orderId: 'ORDER-1',
          amount: 25.5,
          paymentId: 'payment-uuid-1',
        },
        {
          baseUrl: 'https://api.sandbox.konnect.network/api/v2',
          apiKey: 'super-secret-key',
          walletId: 'wallet-123',
          webhookUrl:
            'https://payment-api.example.com/payments/konnect/webhook',
          successUrl: '',
          failUrl: '',
        },
      );

      expect(request.successUrl).toBeUndefined();
      expect(request.failUrl).toBeUndefined();
    });
  });

  describe('mapKonnectStatus', () => {
    it('maps documented Konnect statuses to internal statuses', () => {
      expect(mapKonnectStatus('completed')).toBe(PaymentStatus.PAID);
      expect(mapKonnectStatus('pending')).toBe(PaymentStatus.PENDING);
    });

    it('never invents a status: unknown values map to UNKNOWN', () => {
      expect(mapKonnectStatus('some_future_status')).toBe(
        PaymentStatus.UNKNOWN,
      );
    });
  });

  describe('assertKonnectPaymentMatchesInternalRecord', () => {
    const baseDetails: KonnectPaymentDetails = {
      id: 'pay_1',
      status: 'completed',
      amountDue: 25500,
      reachedAmount: 25500,
      amount: 25500,
      token: 'TND',
      orderId: 'ORDER-1',
    };

    it('passes when amount, currency and orderId all match', () => {
      expect(() =>
        assertKonnectPaymentMatchesInternalRecord(baseDetails, {
          amount: '25.500',
          currency: 'TND',
          orderId: 'ORDER-1',
        }),
      ).not.toThrow();
    });

    it('throws on amount mismatch', () => {
      expect(() =>
        assertKonnectPaymentMatchesInternalRecord(baseDetails, {
          amount: '10.000',
          currency: 'TND',
          orderId: 'ORDER-1',
        }),
      ).toThrow(KonnectPaymentMismatchError);
    });

    it('throws on currency mismatch', () => {
      expect(() =>
        assertKonnectPaymentMatchesInternalRecord(
          { ...baseDetails, token: 'EUR' },
          {
            amount: '25.500',
            currency: 'TND',
            orderId: 'ORDER-1',
          },
        ),
      ).toThrow(KonnectPaymentMismatchError);
    });

    it('throws on orderId mismatch', () => {
      expect(() =>
        assertKonnectPaymentMatchesInternalRecord(baseDetails, {
          amount: '25.500',
          currency: 'TND',
          orderId: 'ORDER-OTHER',
        }),
      ).toThrow(KonnectPaymentMismatchError);
    });
  });
});
