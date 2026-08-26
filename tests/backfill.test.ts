import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { resetTestDatabase } from './helpers/testDb';
import { prisma } from '@/lib/prisma';
import { backfillOrganization } from '../prisma/scripts/backfill-organization';

describe('backfillOrganization', () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates the Cinthia organization and assigns existing rows to it', async () => {
    const category = await prisma.category.create({
      data: { name: 'Bolos', slug: 'bolos' },
    });
    const user = await prisma.user.create({
      data: { email: 'admin@cinthia.com', name: 'Cinthia', password: 'hash' },
    });

    const org = await backfillOrganization(prisma);

    expect(org.subdomain).toBe('cinthia');

    const updatedCategory = await prisma.category.findUniqueOrThrow({ where: { id: category.id } });
    expect(updatedCategory.organizationId).toBe(org.id);

    const updatedUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updatedUser.organizationId).toBe(org.id);
    expect(updatedUser.role).toBe('OWNER');
  });

  it('is idempotent — running it twice does not create a second organization', async () => {
    await backfillOrganization(prisma);
    await backfillOrganization(prisma);

    const orgs = await prisma.organization.findMany({ where: { subdomain: 'cinthia' } });
    expect(orgs).toHaveLength(1);
  });
});
