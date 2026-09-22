import { describe, it, expect } from 'vitest';
import { isOwner } from '@/lib/auth';

describe('isOwner', () => {
  const baseSession = {
    userId: 'u1',
    email: 'a@b.com',
    name: 'Test',
    organizationId: 'org-1',
  };

  it('returns true for an OWNER session', () => {
    expect(isOwner({ ...baseSession, role: 'OWNER' })).toBe(true);
  });

  it('returns false for a STAFF session', () => {
    expect(isOwner({ ...baseSession, role: 'STAFF' })).toBe(false);
  });
});
