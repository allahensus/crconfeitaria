import type { PrismaClient } from '@prisma/client';

export async function backfillOrganization(prisma: PrismaClient) {
  const org = await prisma.organization.upsert({
    where: { subdomain: 'cinthia' },
    update: {},
    create: {
      name: 'Confeitaria Cinthia Rodrigues',
      subdomain: 'cinthia',
      status: 'ACTIVE',
    },
  });

  await prisma.user.updateMany({
    // @ts-expect-error — organizationId is now required in the schema, this null-filter predates that and is now unreachable but harmless
    where: { organizationId: null },
    data: { organizationId: org.id, role: 'OWNER' },
  });

  const modelsToBackfill = [
    'category',
    'product',
    'fillingOption',
    'customer',
    'quote',
    'order',
    'expense',
    'financialTransaction',
    'setting',
    'testimonial',
    'ingredient',
  ] as const;

  for (const model of modelsToBackfill) {
    // @ts-expect-error — dynamic model access, all these models share the organizationId/updateMany shape
    await prisma[model].updateMany({
      where: { organizationId: null },
      data: { organizationId: org.id },
    });
  }

  return org;
}

if (require.main === module) {
  const { prisma } = require('../../src/lib/prisma');
  backfillOrganization(prisma)
    .then((org: { id: string; subdomain: string }) => {
      console.log(`Backfill complete. Organization: ${org.subdomain} (${org.id})`);
      return prisma.$disconnect();
    })
    .catch((err: unknown) => {
      console.error('Backfill failed:', err);
      process.exit(1);
    });
}
