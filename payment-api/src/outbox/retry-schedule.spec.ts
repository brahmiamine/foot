import { computeNextRetryAt, RETRY_SCHEDULE_MINUTES } from './retry-schedule';

describe('computeNextRetryAt (TS-13)', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');

  it('follows the 1 → 5 → 15 → 60 → 360 minute schedule', () => {
    expect(computeNextRetryAt(1, now)).toEqual(
      new Date('2026-01-01T00:01:00.000Z'),
    );
    expect(computeNextRetryAt(2, now)).toEqual(
      new Date('2026-01-01T00:05:00.000Z'),
    );
    expect(computeNextRetryAt(3, now)).toEqual(
      new Date('2026-01-01T00:15:00.000Z'),
    );
    expect(computeNextRetryAt(4, now)).toEqual(
      new Date('2026-01-01T01:00:00.000Z'),
    );
    expect(computeNextRetryAt(5, now)).toEqual(
      new Date('2026-01-01T06:00:00.000Z'),
    );
  });

  it('returns null once the schedule is exhausted — caller must give up (DLQ/FAILED)', () => {
    expect(
      computeNextRetryAt(RETRY_SCHEDULE_MINUTES.length + 1, now),
    ).toBeNull();
    expect(computeNextRetryAt(100, now)).toBeNull();
  });
});
