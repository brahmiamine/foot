import { PaymentStatus } from '../../enums/payment-status.enum';
import {
  FlouciInvalidAmountError,
  FlouciPaymentMismatchError,
} from './flouci.exceptions';
import {
  assertFlouciPaymentMatchesInternalRecord,
  buildFlouciGeneratePaymentRequest,
  mapFlouciStatus,
  mapFlouciVerification,
  millimesToTnd,
  tndToMillimes,
} from './flouci.mapper';
import { FlouciVerifyPaymentResponse } from './flouci.types';

describe('flouci.mapper', () => {
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
      expect(() => tndToMillimes(0)).toThrow(FlouciInvalidAmountError);
      expect(() => tndToMillimes(-1.5)).toThrow(FlouciInvalidAmountError);
    });

    it('rejects malformed amount strings', () => {
      expect(() => tndToMillimes('abc')).toThrow(FlouciInvalidAmountError);
      expect(() => tndToMillimes('1.2.3')).toThrow(FlouciInvalidAmountError);
    });
  });

  describe('millimesToTnd', () => {
    it('is the inverse of tndToMillimes', () => {
      expect(millimesToTnd(25500)).toBe('25.500');
      expect(millimesToTnd(1500)).toBe('1.500');
      expect(millimesToTnd(1)).toBe('0.001');
    });
  });

  describe('buildFlouciGeneratePaymentRequest', () => {
    const config = {
      baseUrl: 'https://developers.flouci.com',
      publicKey: 'public-key',
      privateKey: 'super-secret-private-key',
      webhookUrl:
        'https://payment-api.example.com/payments/providers/flouci/webhook',
      successUrl: 'https://example.com/payment/success',
      failUrl: 'https://example.com/payment/fail',
    };

    it('whitelists only the expected fields and never leaks unrelated data', () => {
      const request = buildFlouciGeneratePaymentRequest(
        { trackingId: 'payment-123', amount: 25.5 },
        config,
      );

      expect(request).toEqual({
        amount: 25500,
        developer_tracking_id: 'payment-123',
        accept_card: true,
        success_link: config.successUrl,
        fail_link: config.failUrl,
        webhook: config.webhookUrl,
      });
      expect(JSON.stringify(request)).not.toContain('super-secret-private-key');
    });

    it('includes client_id only when provided', () => {
      const request = buildFlouciGeneratePaymentRequest(
        {
          trackingId: 'payment-123',
          amount: 25.5,
          clientId: 'customer@example.com',
        },
        config,
      );

      expect(request.client_id).toBe('customer@example.com');
    });
  });

  describe('mapFlouciStatus', () => {
    it('maps documented Flouci statuses to internal statuses', () => {
      expect(mapFlouciStatus('SUCCESS')).toBe(PaymentStatus.PAID);
      expect(mapFlouciStatus('PENDING')).toBe(PaymentStatus.PENDING);
      expect(mapFlouciStatus('EXPIRED')).toBe(PaymentStatus.EXPIRED);
      expect(mapFlouciStatus('FAILURE')).toBe(PaymentStatus.FAILED);
    });

    it('never invents a status: unknown values map to UNKNOWN', () => {
      expect(mapFlouciStatus('SOME_FUTURE_STATUS')).toBe(PaymentStatus.UNKNOWN);
    });
  });

  describe('mapFlouciVerification', () => {
    function response(
      overrides: Partial<FlouciVerifyPaymentResponse> = {},
    ): FlouciVerifyPaymentResponse {
      return {
        success: true,
        result: {
          amount: 25500,
          status: 'SUCCESS',
          developer_tracking_id: 'payment-123',
        },
        ...overrides,
      };
    }

    it('maps to PAID only when success === true AND status === SUCCESS', () => {
      expect(mapFlouciVerification(response())).toBe(PaymentStatus.PAID);
    });

    it('never trusts a SUCCESS status when success !== true', () => {
      expect(mapFlouciVerification(response({ success: false }))).toBe(
        PaymentStatus.UNKNOWN,
      );
    });

    it('maps PENDING/EXPIRED/FAILURE regardless of the success flag', () => {
      expect(
        mapFlouciVerification(
          response({
            result: {
              amount: 25500,
              status: 'PENDING',
              developer_tracking_id: 'p',
            },
          }),
        ),
      ).toBe(PaymentStatus.PENDING);
      expect(
        mapFlouciVerification(
          response({
            result: {
              amount: 25500,
              status: 'EXPIRED',
              developer_tracking_id: 'p',
            },
          }),
        ),
      ).toBe(PaymentStatus.EXPIRED);
      expect(
        mapFlouciVerification(
          response({
            result: {
              amount: 25500,
              status: 'FAILURE',
              developer_tracking_id: 'p',
            },
          }),
        ),
      ).toBe(PaymentStatus.FAILED);
    });
  });

  describe('assertFlouciPaymentMatchesInternalRecord', () => {
    const baseResult = {
      developer_tracking_id: 'payment-123',
      amount: 25500,
    };

    it('passes when amount and developer_tracking_id both match', () => {
      expect(() =>
        assertFlouciPaymentMatchesInternalRecord(baseResult, {
          trackingId: 'payment-123',
          amount: '25.500',
        }),
      ).not.toThrow();
    });

    it('throws on amount mismatch', () => {
      expect(() =>
        assertFlouciPaymentMatchesInternalRecord(baseResult, {
          trackingId: 'payment-123',
          amount: '10.000',
        }),
      ).toThrow(FlouciPaymentMismatchError);
    });

    it('throws on developer_tracking_id mismatch', () => {
      expect(() =>
        assertFlouciPaymentMatchesInternalRecord(baseResult, {
          trackingId: 'payment-OTHER',
          amount: '25.500',
        }),
      ).toThrow(FlouciPaymentMismatchError);
    });
  });
});
