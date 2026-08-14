import { StructuredLoggerService } from './structured-logger.service';
import { runWithCorrelationId } from '../correlation/correlation-context';

function lastWrittenLine(writeSpy: jest.SpyInstance): Record<string, unknown> {
  const calls = writeSpy.mock.calls as unknown as [string][];
  return JSON.parse(calls[0][0]) as Record<string, unknown>;
}

/** TS-58 — logs structurés JSON. */
describe('StructuredLoggerService', () => {
  let writeSpy: jest.SpyInstance;

  beforeEach(() => {
    writeSpy = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  it('emits a JSON line with service/level/message/context', () => {
    const logger = new StructuredLoggerService('payments');

    logger.log('Payment confirmed', 'PaymentService');

    expect(writeSpy).toHaveBeenCalledTimes(1);
    expect(lastWrittenLine(writeSpy)).toMatchObject({
      service: 'payments',
      level: 'log',
      message: 'Payment confirmed',
      context: 'PaymentService',
    });
  });

  it('includes the correlationId when logging inside a request context (TS-57)', () => {
    const logger = new StructuredLoggerService('payments');

    runWithCorrelationId('corr-abc-123', () => {
      logger.log('Payment confirmed');
    });

    expect(lastWrittenLine(writeSpy).correlationId).toBe('corr-abc-123');
  });

  it('omits correlationId when logging outside of any request context', () => {
    const logger = new StructuredLoggerService('payments');

    logger.log('Bootstrap complete');

    expect(lastWrittenLine(writeSpy).correlationId).toBeUndefined();
  });
});
