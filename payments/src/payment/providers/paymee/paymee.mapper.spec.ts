import { PaymentStatus } from '../../enums/payment-status.enum';
import {
  PaymeeInvalidAmountError,
  PaymeePaymentMismatchError,
} from './paymee.exceptions';
import {
  assertPaymeeWebhookMatchesInternalRecord,
  buildPaymeeCreatePaymentRequest,
  formatPaymeeAmount,
  mapPaymeeStatus,
  paymeeCentsToDecimalString,
  tndToPaymeeAmount,
  tndToPaymeeCents,
} from './paymee.mapper';
import { PaymeeWebhookPayload } from './paymee.types';

describe('paymee.mapper', () => {
  describe('tndToPaymeeCents / formatPaymeeAmount / tndToPaymeeAmount', () => {
    it.each([
      ['1.00', 100],
      ['10.50', 1050],
      ['220.25', 22025],
      ['999.99', 99999],
    ])('normalizes %s TND to %i cents deterministically', (amount, cents) => {
      expect(tndToPaymeeCents(amount)).toBe(BigInt(cents));
      expect(tndToPaymeeCents(Number(amount))).toBe(BigInt(cents));
      expect(formatPaymeeAmount(amount)).toBe(amount);
      expect(tndToPaymeeAmount(amount)).toBe(Number(amount));
    });

    it('is immune to classic binary floating-point rounding errors', () => {
      // 0.1 + 0.2 famously is not exactly 0.3 in IEEE754.
      expect(formatPaymeeAmount((0.1 + 0.2).toString().slice(0, 3))).toBe(
        '0.30',
      );
    });

    it('rounds the 3rd decimal (millimes) to cents, half up', () => {
      expect(formatPaymeeAmount('1.005')).toBe('1.01');
      expect(formatPaymeeAmount('1.004')).toBe('1.00');
    });

    it('rejects zero or negative amounts', () => {
      expect(() => tndToPaymeeCents(0)).toThrow(PaymeeInvalidAmountError);
      expect(() => tndToPaymeeCents(-1.5)).toThrow(PaymeeInvalidAmountError);
    });

    it('rejects malformed amount strings', () => {
      expect(() => tndToPaymeeCents('abc')).toThrow(PaymeeInvalidAmountError);
      expect(() => tndToPaymeeCents('1.2.3')).toThrow(PaymeeInvalidAmountError);
    });
  });

  describe('paymeeCentsToDecimalString', () => {
    it('formats cents back to a 2-decimal TND string', () => {
      expect(paymeeCentsToDecimalString(100n)).toBe('1.00');
      expect(paymeeCentsToDecimalString(22025n)).toBe('220.25');
    });
  });

  describe('buildPaymeeCreatePaymentRequest', () => {
    const config = {
      baseUrl: 'https://sandbox.paymee.tn/api/v2',
      apiKey: 'super-secret-key',
      webhookUrl:
        'https://payments.example.com/payments/providers/paymee/webhook',
      returnUrl: 'https://example.com/payment/return',
      cancelUrl: 'https://example.com/payment/cancel',
    };

    it('whitelists only the expected fields and never leaks unrelated data', () => {
      const request = buildPaymeeCreatePaymentRequest(
        {
          orderId: 'ORDER-123',
          amount: 220.25,
          firstName: 'John',
          lastName: 'Doe',
          email: 'test@paymee.tn',
          phoneNumber: '+21611222333',
        },
        config,
      );

      expect(request).toEqual({
        amount: 220.25,
        note: 'Order #ORDER-123',
        first_name: 'John',
        last_name: 'Doe',
        email: 'test@paymee.tn',
        phone: '+21611222333',
        webhook_url: config.webhookUrl,
        return_url: config.returnUrl,
        cancel_url: config.cancelUrl,
        order_id: 'ORDER-123',
      });
      expect(JSON.stringify(request)).not.toContain('super-secret-key');
    });
  });

  describe('mapPaymeeStatus', () => {
    it('maps payment_status=true to PAID', () => {
      expect(mapPaymeeStatus(true)).toBe(PaymentStatus.PAID);
    });

    it('maps payment_status=false to FAILED', () => {
      expect(mapPaymeeStatus(false)).toBe(PaymentStatus.FAILED);
    });
  });

  describe('assertPaymeeWebhookMatchesInternalRecord', () => {
    const basePayload: PaymeeWebhookPayload = {
      token: 'token-123',
      check_sum: 'checksum',
      payment_status: true,
      order_id: 'ORDER-1',
      amount: 220.25,
    };

    it('passes when amount and order_id both match', () => {
      expect(() =>
        assertPaymeeWebhookMatchesInternalRecord(basePayload, {
          orderId: 'ORDER-1',
          amount: '220.250',
        }),
      ).not.toThrow();
    });

    it('throws on amount mismatch', () => {
      expect(() =>
        assertPaymeeWebhookMatchesInternalRecord(basePayload, {
          orderId: 'ORDER-1',
          amount: '200.25',
        }),
      ).toThrow(PaymeePaymentMismatchError);
    });

    it('throws on order_id mismatch', () => {
      expect(() =>
        assertPaymeeWebhookMatchesInternalRecord(basePayload, {
          orderId: 'ORDER-OTHER',
          amount: '220.25',
        }),
      ).toThrow(PaymeePaymentMismatchError);
    });
  });
});
