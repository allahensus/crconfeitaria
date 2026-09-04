import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { resetTestDatabase } from '../helpers/testDb';
import { prisma } from '@/lib/prisma';
import { getScopedPrisma } from '@/lib/db';
import { wouldRemoveLastOwner } from '@/lib/team';

describe('wouldRemoveLastOwner', () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns true when the target is the only OWNER in the organization', async () => {
    const org = await prisma.organization.create({ data: { name: 'Loja A', subdomain: 'loja-a' } });
    const owner = await prisma.user.create({
      data: { email: 'dona@loja-a.com', name: 'Dona', password: 'hash', role: 'OWNER', organizationId: org.id },
    });

    const db = getScopedPrisma(org.id);
    expect(await wouldRemoveLastOwner(db, org.id, owner.id)).toBe(true);
  });

  it('returns false when another OWNER remains in the organization', async () => {
    const org = await prisma.organization.create({ data: { name: 'Loja A', subdomain: 'loja-a' } });
    const ownerA = await prisma.user.create({
      data: { email: 'dona1@loja-a.com', name: 'Dona 1', password: 'hash', role: 'OWNER', organizationId: org.id },
    });
    await prisma.user.create({
      data: { email: 'dona2@loja-a.com', name: 'Dona 2', password: 'hash', role: 'OWNER', organizationId: org.id },
    });

    const db = getScopedPrisma(org.id);
    expect(await wouldRemoveLastOwner(db, org.id, ownerA.id)).toBe(false);
  });

  it('does not count a STAFF account as a remaining OWNER', async () => {
    const org = await prisma.organization.create({ data: { name: 'Loja A', subdomain: 'loja-a' } });
    const owner = await prisma.user.create({
      data: { email: 'dona@loja-a.com', name: 'Dona', password: 'hash', role: 'OWNER', organizationId: org.id },
    });
    await prisma.user.create({
      data: { email: 'funcionaria@loja-a.com', name: 'Funcionária', password: 'hash', role: 'STAFF', organizationId: org.id },
    });

    const db = getScopedPrisma(org.id);
    expect(await wouldRemoveLastOwner(db, org.id, owner.id)).toBe(true);
  });

  it('does not count an OWNER from a different organization', async () => {
    const orgA = await prisma.organization.create({ data: { name: 'Loja A', subdomain: 'loja-a' } });
    const orgB = await prisma.organization.create({ data: { name: 'Loja B', subdomain: 'loja-b' } });
    const ownerA = await prisma.user.create({
      data: { email: 'dona@loja-a.com', name: 'Dona A', password: 'hash', role: 'OWNER', organizationId: orgA.id },
    });
    await prisma.user.create({
      data: { email: 'dona@loja-b.com', name: 'Dona B', password: 'hash', role: 'OWNER', organizationId: orgB.id },
    });

    const dbA = getScopedPrisma(orgA.id);
    // Org B having its own OWNER must not count toward org A's remaining owners.
    expect(await wouldRemoveLastOwner(dbA, orgA.id, ownerA.id)).toBe(true);
  });
});
