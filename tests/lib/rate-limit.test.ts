import { describe, it, expect, vi, afterEach } from 'vitest';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

describe('checkRateLimit', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests up to the configured max', () => {
    const key = `test-${Math.random()}`;
    const config = { windowMs: 60_000, max: 3 };

    expect(checkRateLimit(key, config)).toBe(true);
    expect(checkRateLimit(key, config)).toBe(true);
    expect(checkRateLimit(key, config)).toBe(true);
  });

  it('rejects the request that exceeds max within the window', () => {
    const key = `test-${Math.random()}`;
    const config = { windowMs: 60_000, max: 2 };

    expect(checkRateLimit(key, config)).toBe(true);
    expect(checkRateLimit(key, config)).toBe(true);
    expect(checkRateLimit(key, config)).toBe(false);
  });

  it('resets the count once the window has elapsed', () => {
    vi.useFakeTimers();
    const key = `test-${Math.random()}`;
    const config = { windowMs: 1000, max: 1 };

    expect(checkRateLimit(key, config)).toBe(true);
    expect(checkRateLimit(key, config)).toBe(false);

    vi.advanceTimersByTime(1001);

    expect(checkRateLimit(key, config)).toBe(true);
  });

  it('tracks separate keys independently', () => {
    const config = { windowMs: 60_000, max: 1 };
    const keyA = `test-a-${Math.random()}`;
    const keyB = `test-b-${Math.random()}`;

    expect(checkRateLimit(keyA, config)).toBe(true);
    expect(checkRateLimit(keyA, config)).toBe(false);
    expect(checkRateLimit(keyB, config)).toBe(true);
  });
});

describe('getClientIp', () => {
  it('reads the first address from x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1' });
    expect(getClientIp(headers)).toBe('203.0.113.5');
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    const headers = new Headers({ 'x-real-ip': '203.0.113.9' });
    expect(getClientIp(headers)).toBe('203.0.113.9');
  });

  it('falls back to "unknown" when neither header is present', () => {
    const headers = new Headers();
    expect(getClientIp(headers)).toBe('unknown');
  });
});
