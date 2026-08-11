import { createHash } from 'crypto';
import { computePaymeeChecksum, verifyPaymeeChecksum } from './paymee.checksum';

describe('paymee.checksum', () => {
  const apiKey = 'super-secret-api-key';
  const token = 'dfe54df34b54df3a854f3a53fc85a';

  function md5(input: string): string {
    return createHash('md5').update(input).digest('hex');
  }

  describe('computePaymeeChecksum', () => {
    it('computes MD5(token + "1" + apiKey) for a successful payment', () => {
      expect(computePaymeeChecksum(token, true, apiKey)).toBe(
        md5(`${token}1${apiKey}`),
      );
    });

    it('computes MD5(token + "0" + apiKey) for a failed payment', () => {
      expect(computePaymeeChecksum(token, false, apiKey)).toBe(
        md5(`${token}0${apiKey}`),
      );
    });

    it('never leaks the API key in its output', () => {
      const checksum = computePaymeeChecksum(token, true, apiKey);
      expect(checksum).not.toContain(apiKey);
      expect(checksum).toMatch(/^[a-f0-9]{32}$/);
    });
  });

  describe('verifyPaymeeChecksum', () => {
    it('accepts a correctly computed checksum for a successful payment', () => {
      const checksum = computePaymeeChecksum(token, true, apiKey);
      expect(verifyPaymeeChecksum(token, true, apiKey, checksum)).toBe(true);
    });

    it('accepts a correctly computed checksum for a failed payment', () => {
      const checksum = computePaymeeChecksum(token, false, apiKey);
      expect(verifyPaymeeChecksum(token, false, apiKey, checksum)).toBe(true);
    });

    it('is case-insensitive on the received checksum', () => {
      const checksum = computePaymeeChecksum(token, true, apiKey);
      expect(
        verifyPaymeeChecksum(token, true, apiKey, checksum.toUpperCase()),
      ).toBe(true);
    });

    it('rejects an invalid checksum', () => {
      expect(
        verifyPaymeeChecksum(token, true, apiKey, 'not-the-right-checksum'),
      ).toBe(false);
    });

    it('rejects when the payment_status used does not match what was signed (tampered status)', () => {
      const checksum = computePaymeeChecksum(token, true, apiKey);
      expect(verifyPaymeeChecksum(token, false, apiKey, checksum)).toBe(false);
    });

    it('rejects when the token does not match what was signed (tampered/invalid token)', () => {
      const checksum = computePaymeeChecksum(token, true, apiKey);
      expect(
        verifyPaymeeChecksum('a-different-token', true, apiKey, checksum),
      ).toBe(false);
    });

    it('rejects when verified against the wrong API key', () => {
      const checksum = computePaymeeChecksum(token, true, apiKey);
      expect(
        verifyPaymeeChecksum(token, true, 'a-different-api-key', checksum),
      ).toBe(false);
    });

    it('rejects a malformed/short checksum without throwing', () => {
      expect(verifyPaymeeChecksum(token, true, apiKey, 'short')).toBe(false);
    });
  });
});
