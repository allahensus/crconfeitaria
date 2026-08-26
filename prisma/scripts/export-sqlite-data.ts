import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const prisma = new PrismaClient();

// NOTE: the source SQLite database (prisma/dev.db) predates the multi-tenant migration
// entirely — it has no `organization` table and no `organizationId` columns at all (this was
// confirmed by introspecting the real dev.db; the tracked schema.prisma had already grown the
// Organization model and organizationId columns by the time this script was written, but that
// change was never applied — via `prisma db push` — to the real dev.db file). So this script
// must be run against a temporary SQLite-flavored schema.prisma that matches the OLD, pre-org
// shape (no Organization model, no organizationId fields) to be able to read the data at all.
//
// Because the source data has no organization concept, this script also synthesizes the single
// Cinthia organization record and stamps organizationId onto every organization-scoped row,
// mirroring the equivalent runtime backfill in prisma/scripts/backfill-organization.ts (same
// subdomain/name, and the same role: 'OWNER' transform for the admin user). This keeps
// prisma/scripts/import-postgres-data.ts a dumb, mechanical createMany loop against the live
// (current) multi-tenant schema.

const EXPORT_MODELS = [
  'user',
  'category',
  'product',
  'productVariation',
  'fillingOption',
  'customer',
  'quote',
  'quoteItem',
  'order',
  'orderItem',
  'payment',
  'expense',
  'financialTransaction',
  'setting',
  'testimonial',
  'ingredient',
  'recipeItem',
] as const;

// Models that carry a direct organizationId foreign key in the current multi-tenant schema.
// (productVariation, quoteItem, orderItem, payment, recipeItem cascade via their parent instead
// and have no organizationId column of their own.)
const ORG_SCOPED_MODELS = new Set<string>([
  'user',
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
]);

async function main() {
  const data: Record<string, Record<string, unknown>[]> = {};

  for (const model of EXPORT_MODELS) {
    // @ts-expect-error dynamic model access
    data[model] = await prisma[model].findMany();
    console.log(`Exported ${data[model].length} rows from ${model}`);
  }

  const now = new Date().toISOString();
  const organization = {
    id: crypto.randomUUID(),
    name: 'Confeitaria Cinthia Rodrigues',
    subdomain: 'cinthia',
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  };
  console.log(`Exported 1 rows from organization (synthesized: ${organization.subdomain} / ${organization.id})`);

  for (const model of EXPORT_MODELS) {
    if (!ORG_SCOPED_MODELS.has(model)) continue;
    data[model] = data[model].map((row) => ({
      ...row,
      organizationId: organization.id,
      ...(model === 'user' ? { role: 'OWNER' } : {}),
    }));
  }

  const output: Record<string, unknown[]> = { organization: [organization], ...data };

  const outPath = path.join(process.cwd(), 'prisma', 'data-export.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`Wrote ${outPath}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
