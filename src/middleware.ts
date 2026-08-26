import { NextRequest, NextResponse } from 'next/server';
import { extractSubdomain } from '@/lib/tenant-subdomain';

const ROOT_DOMAIN = (process.env.ROOT_DOMAIN || 'localhost').split(':')[0];

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
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
