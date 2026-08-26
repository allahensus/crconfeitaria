import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Import order matters: parents before children, to satisfy foreign keys.
const IMPORT_ORDER = [
  'organization',
  'user',
  'category',
  'product',
  'productVariation',
  'fillingOption',
  'customer',
  'quote',
  'order',
  'quoteItem',
  'orderItem',
  'payment',
  'expense',
  'financialTransaction',
  'setting',
  'testimonial',
  'ingredient',
  'recipeItem',
] as const;

async function main() {
  const inPath = path.join(process.cwd(), 'prisma', 'data-export.json');
  const data = JSON.parse(fs.readFileSync(inPath, 'utf-8'));

  for (const model of IMPORT_ORDER) {
    const rows = data[model] ?? [];
    if (rows.length === 0) {
      console.log(`Skipping ${model} — no rows`);
      continue;
    }
    // @ts-expect-error dynamic model access
    const result = await prisma[model].createMany({ data: rows, skipDuplicates: true });
    console.log(`Imported ${result.count} rows into ${model}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
