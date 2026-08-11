import { createHash, timingSafeEqual } from 'crypto';

/**
 * Paymee's documented webhook integrity check:
 *
 *   check_sum = MD5(token + payment_status + API_KEY)
 *
 * where `payment_status` is represented as "1" (success) or "0" (failure),
 * not the JSON boolean. https://www.paymee.tn/paymee-integration-with-redirection/
 */
export function computePaymeeChecksum(
  token: string,
  paymentStatus: boolean,
  apiKey: string,
): string {
  const input = `${token}${paymentStatus ? '1' : '0'}${apiKey}`;
  return createHash('md5').update(input).digest('hex');
}

/**
 * Compares the check_sum received in a webhook against the one we compute,
 * using a constant-time comparison so the response never leaks how many
 * characters of a guessed checksum were correct.
 */
export function verifyPaymeeChecksum(
  token: string,
  paymentStatus: boolean,
  apiKey: string,
  receivedChecksum: string,
): boolean {
  const expected = computePaymeeChecksum(token, paymentStatus, apiKey);

  if (
    typeof receivedChecksum !== 'string' ||
    receivedChecksum.length !== expected.length
  ) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(expected.toLowerCase(), 'utf8'),
    Buffer.from(receivedChecksum.toLowerCase(), 'utf8'),
  );
}
