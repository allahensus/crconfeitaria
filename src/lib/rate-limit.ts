// Best-effort, zero-cost rate limiting for the handful of public endpoints
// that are worth throttling (login, public quote creation, coupon
// validation, order tracking). Deliberately simple: an in-memory counter per
// (route, client IP), reset once its window elapses.
//
// Known, accepted limitation: this state lives in the memory of a single
// function instance. Vercel's Fluid Compute reuses a warm instance across
// many consecutive requests, so in practice this catches the common case --
// one script hammering an endpoint from one place -- but a request that
// lands on a different (e.g. freshly cold-started) instance starts its own
// counter at zero. This is NOT a substitute for a shared store (Redis/KV)
// and does not defend against a distributed attack; that tier is explicitly
// deferred pending a real infrastructure decision (see the security audit).
// It is, however, free and meaningfully better than nothing.

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, RateLimitEntry>();

// Routes worth throttling, keyed by "METHOD path". Everything else is left
// alone -- this is not a blanket rate limiter for the whole API.
export const RATE_LIMITED_ROUTES: Record<string, RateLimitConfig> = {
  'POST /api/auth/login': { windowMs: 5 * 60 * 1000, max: 5 },
  'POST /api/quotes': { windowMs: 10 * 60 * 1000, max: 10 },
  'POST /api/coupons/validate': { windowMs: 5 * 60 * 1000, max: 15 },
  'GET /api/track': { windowMs: 5 * 60 * 1000, max: 20 },
  'POST /api/reviews': { windowMs: 10 * 60 * 1000, max: 10 },
};

const LARGEST_WINDOW_MS = Math.max(...Object.values(RATE_LIMITED_ROUTES).map((c) => c.windowMs));
const PRUNE_THRESHOLD = 5000; // only bother sweeping once the map gets non-trivial

function pruneExpired(now: number): void {
  if (store.size < PRUNE_THRESHOLD) return;
  for (const [key, entry] of store) {
    if (now - entry.windowStart > LARGEST_WINDOW_MS) {
      store.delete(key);
    }
  }
}

/**
 * Returns true if this request is allowed, false if the caller has exceeded
 * `config.max` attempts within `config.windowMs`.
 */
export function checkRateLimit(key: string, config: RateLimitConfig): boolean {
  const now = Date.now();
  pruneExpired(now);

  const entry = store.get(key);
  if (!entry || now - entry.windowStart > config.windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return true;
  }

  entry.count += 1;
  return entry.count <= config.max;
}

export function getClientIp(headers: Headers): string {
  // Vercel populates x-forwarded-for with the real client IP first in the list.
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return headers.get('x-real-ip') || 'unknown';
}
