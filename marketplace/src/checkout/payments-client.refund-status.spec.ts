import { normalizeRefundStatus } from './payments-client.service';

describe('normalizeRefundStatus', () => {
  it('keeps centrally awaiting refunds pending in the reconciliation queue', () => {
    expect(normalizeRefundStatus('AWAITING_APPROVAL')).toBe('REQUESTED');
  });

  it('preserves known refund states', () => {
    expect(normalizeRefundStatus('PROCESSING')).toBe('PROCESSING');
    expect(normalizeRefundStatus('SUCCEEDED')).toBe('SUCCEEDED');
    expect(normalizeRefundStatus('MANUAL_REVIEW')).toBe('MANUAL_REVIEW');
  });

  it('rejects unknown payment-service states', () => {
    expect(normalizeRefundStatus('UNRECOGNIZED')).toBeNull();
    expect(normalizeRefundStatus(undefined)).toBeNull();
  });
});
