import { NextRequest, NextResponse } from 'next/server';
import { extractSubdomain } from '@/lib/tenant-subdomain';
import { RATE_LIMITED_ROUTES, checkRateLimit, getClientIp } from '@/lib/rate-limit';

const ROOT_DOMAIN = (process.env.ROOT_DOMAIN || 'localhost').split(':')[0];
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';

  // Best-effort rate limiting on a short list of public, abuse-prone routes.
  // See src/lib/rate-limit.ts for exactly what this does and doesn't defend
  // against -- it's a free, partial mitigation, not a substitute for a real
  // shared rate limiter.
  const routeKey = `${request.method} ${request.nextUrl.pathname}`;
  const limitConfig = RATE_LIMITED_ROUTES[routeKey];
  if (limitConfig) {
    const ip = getClientIp(request.headers);
    if (!checkRateLimit(`${routeKey}:${ip}`, limitConfig)) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
        { status: 429 }
      );
    }
  }

  // Defense-in-depth against CSRF: the cookie is SameSite=lax, which already
  // blocks the classic cross-site <form> POST in modern browsers, but adds
  // no protection of its own beyond that. A browser always sets Origin on a
  // cross-site request, so a mismatch here is a strong signal to reject --
  // absence of Origin is not, so requests that don't send it (non-browser
  // clients) are left alone rather than blocked.
  if (MUTATING_METHODS.has(request.method) && request.nextUrl.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    if (origin) {
      let originHost = '';
      try {
        originHost = new URL(origin).host;
      } catch {
        // malformed Origin header -- treat like a mismatch below
      }
      if (originHost !== host) {
        return NextResponse.json({ error: 'Origem da requisição não permitida.' }, { status: 403 });
      }
    }
  }

  const subdomain = extractSubdomain(host, ROOT_DOMAIN);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete('x-tenant-subdomain');
  if (subdomain) {
    requestHeaders.set('x-tenant-subdomain', subdomain);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
