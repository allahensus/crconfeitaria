import { describe, it, expect } from 'vitest';
import { daysUntilNextBirthday, isBirthdayWithinDays } from '@/lib/birthdays';

describe('daysUntilNextBirthday', () => {
  it('returns 0 when today is the birthday', () => {
    const now = new Date(2026, 8, 15); // Sept 15, 2026
    const birth = new Date(1990, 8, 15);
    expect(daysUntilNextBirthday(birth, now)).toBe(0);
  });

  it('counts forward within the same year', () => {
    const now = new Date(2026, 8, 15);
    const birth = new Date(1990, 8, 25);
    expect(daysUntilNextBirthday(birth, now)).toBe(10);
  });

  it('wraps to next year when the birthday already passed this year', () => {
    const now = new Date(2026, 8, 15); // Sept 15
    const birth = new Date(1990, 8, 1); // Sept 1 -- already passed
    // Sept 15 -> Sept 1 next year = 351 days (2027 is not a leap-affecting stretch here)
    const result = daysUntilNextBirthday(birth, now);
    expect(result).toBeGreaterThan(300);
    expect(result).toBeLessThan(366);
  });

  it('handles the December-to-January wrap', () => {
    const now = new Date(2026, 11, 28); // Dec 28
    const birth = new Date(1990, 0, 3); // Jan 3
    expect(daysUntilNextBirthday(birth, now)).toBe(6);
  });
});

describe('isBirthdayWithinDays', () => {
  it('is true right at the edge of the window', () => {
    const now = new Date(2026, 8, 1);
    const birth = new Date(1990, 8, 31);
    expect(isBirthdayWithinDays(birth, 30, now)).toBe(true);
  });

  it('is false just past the window', () => {
    const now = new Date(2026, 8, 1);
    const birth = new Date(1990, 9, 2); // 31 days out
    expect(isBirthdayWithinDays(birth, 30, now)).toBe(false);
  });

  it('is true for a birthday that already happened earlier today onward, not days ago', () => {
    const now = new Date(2026, 8, 15);
    const birth = new Date(1990, 8, 10); // 5 days ago -- should no longer count as "upcoming"
    expect(isBirthdayWithinDays(birth, 30, now)).toBe(false);
  });
});
