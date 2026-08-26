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

  it('is a safe no-op against already-organized data', async () => {
    const org = await backfillOrganization(prisma);

    const category = await prisma.category.create({
      data: { name: 'Bolos', slug: 'bolos', organizationId: org.id },
    });

    await backfillOrganization(prisma);

    const unchangedCategory = await prisma.category.findUniqueOrThrow({ where: { id: category.id } });
    expect(unchangedCategory.organizationId).toBe(org.id);

    const orgs = await prisma.organization.findMany({ where: { subdomain: 'cinthia' } });
    expect(orgs).toHaveLength(1);
  });

  it('is idempotent — running it twice does not create a second organization', async () => {
    await backfillOrganization(prisma);
    await backfillOrganization(prisma);

    const orgs = await prisma.organization.findMany({ where: { subdomain: 'cinthia' } });
    expect(orgs).toHaveLength(1);
  });
});
