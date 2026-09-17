import { describe, it, expect } from 'vitest';
import { checkDateAvailability } from '@/lib/availability';

describe('checkDateAvailability', () => {
  const fixedNow = new Date(2026, 8, 15); // Sept 15, 2026 (local time, no DST surprises)

  it('is available for a future date that is not blocked and past the lead time', () => {
    const result = checkDateAvailability('2026-10-01', [], 3, fixedNow);
    expect(result).toEqual({ available: true });
  });

  it('is too_soon for a date before today + minLeadDays', () => {
    const result = checkDateAvailability('2026-09-16', [], 3, fixedNow);
    expect(result).toEqual({ available: false, reason: 'too_soon' });
  });

  it('is available exactly at the minLeadDays boundary', () => {
    const result = checkDateAvailability('2026-09-18', [], 3, fixedNow);
    expect(result).toEqual({ available: true });
  });

  it('is blocked for a date past the lead time but marked as blocked', () => {
    const result = checkDateAvailability('2026-10-01', ['2026-10-01'], 3, fixedNow);
    expect(result).toEqual({ available: false, reason: 'blocked' });
  });

  it('reports too_soon (not blocked) when a date is both too soon and blocked', () => {
    const result = checkDateAvailability('2026-09-16', ['2026-09-16'], 3, fixedNow);
    expect(result).toEqual({ available: false, reason: 'too_soon' });
  });

  it('defaults now to the current time when not provided', () => {
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 1);
    const dateStr = farFuture.toISOString().slice(0, 10);
    const result = checkDateAvailability(dateStr, [], 3);
    expect(result).toEqual({ available: true });
  });
});
