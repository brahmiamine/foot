import { computeQuietHoursDelayMs } from './quiet-hours.util';

describe('computeQuietHoursDelayMs', () => {
  const timezone = 'Africa/Tunis'; // UTC+1, sans heure d'été depuis 2005.

  it('returns 0 when no quiet hours are configured', () => {
    const at = new Date('2026-01-15T12:00:00.000Z');
    expect(
      computeQuietHoursDelayMs(
        { timezone, quietHoursStart: null, quietHoursEnd: null },
        at,
      ),
    ).toBe(0);
  });

  it('returns 0 when the timestamp falls outside a same-day window', () => {
    // 14:00 UTC+1, window 22:00-23:00 -> outside.
    const at = new Date('2026-01-15T13:00:00.000Z');
    expect(
      computeQuietHoursDelayMs(
        { timezone, quietHoursStart: '22:00', quietHoursEnd: '23:00' },
        at,
      ),
    ).toBe(0);
  });

  it('defers to the end of an overnight window when inside the evening portion', () => {
    // 23:30 local (UTC+1) = 22:30 UTC, window 22:00 -> 07:00 (wraps midnight).
    const at = new Date('2026-01-15T22:30:00.000Z');
    const delay = computeQuietHoursDelayMs(
      { timezone, quietHoursStart: '22:00', quietHoursEnd: '07:00' },
      at,
    );
    // Expect delivery to land exactly at 07:00 local the next day (06:00 UTC).
    const expected =
      new Date('2026-01-16T06:00:00.000Z').getTime() - at.getTime();
    expect(delay).toBe(expected);
  });

  it('defers to the end of an overnight window when inside the early-morning portion', () => {
    // 03:00 local (UTC+1) = 02:00 UTC, still before the 07:00 local end, same calendar day.
    const at = new Date('2026-01-16T02:00:00.000Z');
    const delay = computeQuietHoursDelayMs(
      { timezone, quietHoursStart: '22:00', quietHoursEnd: '07:00' },
      at,
    );
    const expected =
      new Date('2026-01-16T06:00:00.000Z').getTime() - at.getTime();
    expect(delay).toBe(expected);
  });

  it('bypasses when the window is degenerate (start === end)', () => {
    const at = new Date('2026-01-15T22:30:00.000Z');
    expect(
      computeQuietHoursDelayMs(
        { timezone, quietHoursStart: '22:00', quietHoursEnd: '22:00' },
        at,
      ),
    ).toBe(0);
  });
});
