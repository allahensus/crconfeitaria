import { describe, it, expect } from 'vitest';
import { extractSubdomain } from '@/lib/tenant-subdomain';

describe('extractSubdomain', () => {
  it('extracts the subdomain from a tenant host', () => {
    expect(extractSubdomain('cinthia.seusaas.com.br', 'seusaas.com.br')).toBe('cinthia');
  });

  it('extracts the subdomain when a port is present (local dev)', () => {
    expect(extractSubdomain('cinthia.localhost:3007', 'localhost')).toBe('cinthia');
  });

  it('returns null for the bare root domain', () => {
    expect(extractSubdomain('seusaas.com.br', 'seusaas.com.br')).toBeNull();
  });

  it('returns null for www', () => {
    expect(extractSubdomain('www.seusaas.com.br', 'seusaas.com.br')).toBeNull();
  });

  it('returns null for an unrelated host', () => {
    expect(extractSubdomain('example.com', 'seusaas.com.br')).toBeNull();
  });

  it('returns null for a nested sub-subdomain', () => {
    expect(extractSubdomain('a.b.seusaas.com.br', 'seusaas.com.br')).toBeNull();
  });
});
