import { describe, it, expect } from 'vitest';
import { userBelongsToOrganization } from '@/lib/tenant-auth';

describe('userBelongsToOrganization', () => {
  it('returns true when the ids match', () => {
    expect(userBelongsToOrganization({ organizationId: 'org-1' }, 'org-1')).toBe(true);
  });

  it('returns false when the ids differ', () => {
    expect(userBelongsToOrganization({ organizationId: 'org-1' }, 'org-2')).toBe(false);
  });
});
