# Fundação Multi-Tenant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-tenant isolation to the Confeitaria Cinthia system — a new `Organization` model, `organizationId` on every business table, tenant resolution by subdomain, a Prisma extension that makes it impossible to query the database without a tenant scope, and a migration from SQLite to Postgres (Supabase) that preserves the existing Cinthia data as the first tenant.

**Architecture:** Schema-first (no Prisma migration history exists yet — the project uses `prisma db push`). Add `organizationId` as nullable everywhere, backfill existing rows into a "Confeitaria Cinthia" organization, then tighten to required + composite unique constraints — all still on SQLite. Only once that's solid locally do we switch the datasource to Postgres and move the data over. All ~15 API routes that call `prisma` directly get rewritten to go through a `getScopedPrisma(organizationId)` helper that auto-injects the tenant filter into every query, so a route can't forget to scope by tenant.

**Tech Stack:** Next.js 15 (App Router) + Prisma 6 + SQLite → Postgres (Supabase) + Vitest (new — no test framework exists yet).

**Spec:** `docs/superpowers/specs/2026-08-25-multi-tenant-foundation-design.md`

## Global Constraints

- This is piece 1 of a 6-piece SaaS roadmap (see spec's Context section). Nothing here should implement onboarding UI, billing, white-labeling, or visual redesign — those are separate future plans.
- No test framework exists in this repo today — Task 1 adds Vitest.
- The project uses `prisma db push` (`npm run db:push`), not `prisma migrate` — there is no `prisma/migrations` folder. Keep using `db push` throughout this plan; do not introduce migration files.
- Every user-facing string in code you touch stays in Portuguese (pt-BR), matching the existing codebase.
- Run shell commands from the repo root: `C:\Users\allan\OneDrive\Desktop\CONFEITARIA_CINTHIA`.
- Commit after every task (not every step) unless a step says otherwise.

---

## Task 1: Test framework + test database harness

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `tests/helpers/testDb.ts`
- Create: `tests/smoke.test.ts`
- Modify: `package.json` (add `test` script and devDependencies)

**Interfaces:**
- Produces: `resetTestDatabase()` and `TEST_DATABASE_URL` from `tests/helpers/testDb.ts`, used by every later task that needs a real database in a test.

- [ ] **Step 1: Install Vitest and the tsconfig-paths plugin**

```bash
npm install -D vitest vite-tsconfig-paths
```

- [ ] **Step 2: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 20000,
  },
});
```

- [ ] **Step 3: Write `tests/setup.ts`**

This runs before any test file is imported, so every later `import { prisma } from '@/lib/prisma'` inside a test picks up the test database instead of the real dev database.

```ts
import path from 'path';

process.env.DATABASE_URL = `file:${path.join(process.cwd(), 'prisma', 'test.db')}`;
```

- [ ] **Step 4: Write `tests/helpers/testDb.ts`**

```ts
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

export const TEST_DB_PATH = path.join(process.cwd(), 'prisma', 'test.db');
export const TEST_DATABASE_URL = `file:${TEST_DB_PATH}`;

export function resetTestDatabase() {
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  });
}
```

- [ ] **Step 5: Write `tests/smoke.test.ts`**

```ts
import { describe, it, expect } from 'vitest';

describe('vitest setup', () => {
  it('runs a basic assertion', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Add the `test` script to `package.json`**

In the `"scripts"` block, add:

```json
"test": "vitest run"
```

- [ ] **Step 7: Run the smoke test**

Run: `npm test`
Expected: 1 passed, `tests/smoke.test.ts`.

- [ ] **Step 8: Add `prisma/test.db` to `.gitignore`**

Check `.gitignore` for an existing `*.db` or `dev.db` entry. If `prisma/test.db` isn't already covered, add a line `prisma/test.db` to `.gitignore`.

- [ ] **Step 9: Commit**

```bash
git add vitest.config.ts tests/ package.json package-lock.json .gitignore
git commit -m "test: add vitest and a disposable test-database harness"
```

---

## Task 2: Add `Organization` model and nullable tenant fields to the schema

**Files:**
- Modify: `prisma/schema.prisma`
- Test: `tests/schema.test.ts`

**Interfaces:**
- Produces: `Organization` model; `organizationId String?` (nullable) on `User`, `Category`, `Product`, `FillingOption`, `Customer`, `Quote`, `Order`, `Expense`, `FinancialTransaction`, `Setting`, `Testimonial`, `Ingredient`. `User.role` becomes `"OWNER" | "STAFF"` (still a plain `String` column, default `"OWNER"`).

This task does **not** touch existing unique constraints (`slug @unique`, `quoteNumber @unique`, `orderNumber @unique`, `key @unique` all stay exactly as they are) and does **not** make `organizationId` required yet — that's Task 4, after the backfill in Task 3.

- [ ] **Step 1: Write the failing test**

```ts
// tests/schema.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resetTestDatabase } from './helpers/testDb';
import { prisma } from '@/lib/prisma';

describe('Organization model', () => {
  beforeAll(() => {
    resetTestDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates an organization and links a user to it', async () => {
    const org = await prisma.organization.create({
      data: { name: 'Loja Teste', subdomain: 'loja-teste' },
    });

    const user = await prisma.user.create({
      data: {
        email: 'dona@loja-teste.com',
        name: 'Dona da Loja',
        password: 'hash',
        role: 'OWNER',
        organizationId: org.id,
      },
    });

    expect(user.organizationId).toBe(org.id);
    expect(org.status).toBe('ACTIVE');
  });

  it('still allows organizationId to be null on existing models (not backfilled yet)', async () => {
    const category = await prisma.category.create({
      data: { name: 'Categoria Sem Loja', slug: 'categoria-sem-loja' },
    });
    expect(category.organizationId).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/schema.test.ts`
Expected: FAIL — `prisma.organization` does not exist on the Prisma client yet.

- [ ] **Step 3: Edit `prisma/schema.prisma`**

Add the `Organization` model right after the `generator client` block (before `model User`):

```prisma
model Organization {
  id        String   @id @default(uuid())
  name      String
  subdomain String   @unique
  status    String   @default("ACTIVE") // TRIAL, ACTIVE, SUSPENDED
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users                 User[]
  categories            Category[]
  products              Product[]
  fillingOptions        FillingOption[]
  customers             Customer[]
  quotes                Quote[]
  orders                Order[]
  expenses              Expense[]
  financialTransactions FinancialTransaction[]
  settings              Setting[]
  testimonials          Testimonial[]
  ingredients           Ingredient[]
}
```

Then modify each of these models to add the two fields shown (keep every other field exactly as it is today):

`User` — replace `role String @default("ADMIN")` with `role String @default("OWNER")`, and add after `password String`:
```prisma
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
```

`Category` — add after `order Int @default(0)`:
```prisma
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
```

`Product` — add after `featured Boolean @default(false)`:
```prisma
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
```

`FillingOption` — add after `description String?`:
```prisma
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
```

`Customer` — add after `ordersCount Int @default(0)`:
```prisma
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
```

`Quote` — add after `status String @default("PENDING")`:
```prisma
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
```

`Order` — add after `notes String?`:
```prisma
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
```

`Expense` — add after `notes String?`:
```prisma
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
```

`FinancialTransaction` — add after `expense Expense? @relation(fields: [expenseId], references: [id], onDelete: SetNull)`:
```prisma
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
```

`Setting` — add after `value String`:
```prisma
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
```

`Testimonial` — add after `avatarUrl String?`:
```prisma
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
```

`Ingredient` — add after `category String @default("Ingredientes")`:
```prisma
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
```

`ProductVariation`, `QuoteItem`, `OrderItem`, `Payment`, `RecipeItem` — **do not modify**, they stay scoped transitively through their parent.

- [ ] **Step 4: Push the schema and regenerate the client**

```bash
npm run db:push
```
Answer any SQLite "accept data loss" prompt with yes if asked (only adds nullable columns, no data is lost).

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/schema.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma tests/schema.test.ts
git commit -m "feat: add Organization model and nullable organizationId across business models"
```

---

## Task 3: Backfill existing data into the "Confeitaria Cinthia" organization

**Files:**
- Create: `prisma/scripts/backfill-organization.ts`
- Test: `tests/backfill.test.ts`

**Interfaces:**
- Consumes: `resetTestDatabase()` from Task 1, the schema from Task 2.
- Produces: `backfillOrganization(prismaClient)` exported from `prisma/scripts/backfill-organization.ts`, returning the created/found `Organization`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/backfill.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { resetTestDatabase } from './helpers/testDb';
import { prisma } from '@/lib/prisma';
import { backfillOrganization } from '../prisma/scripts/backfill-organization';

describe('backfillOrganization', () => {
  beforeEach(() => {
    resetTestDatabase();
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/backfill.test.ts`
Expected: FAIL — cannot find module `../prisma/scripts/backfill-organization`.

- [ ] **Step 3: Write `prisma/scripts/backfill-organization.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/backfill.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Run the backfill against the real dev database**

```bash
npx tsx prisma/scripts/backfill-organization.ts
```
Expected output: `Backfill complete. Organization: cinthia (<uuid>)`.

- [ ] **Step 6: Commit**

```bash
git add prisma/scripts/backfill-organization.ts tests/backfill.test.ts
git commit -m "feat: backfill existing data into the Confeitaria Cinthia organization"
```

---

## Task 4: Tighten schema — required `organizationId` + composite unique constraints

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `tests/schema.test.ts`

**Interfaces:**
- Produces: `organizationId` required (non-nullable) on all 11 models from Task 2. New compound unique field names generated by Prisma: `organizationId_slug` (on `Category`, `Product`), `organizationId_quoteNumber` (on `Quote`), `organizationId_orderNumber` (on `Order`), `organizationId_key` (on `Setting`). These exact names are used by every later task that does a compound lookup.

- [ ] **Step 1: Update the test to assert the new constraints**

Replace the second test in `tests/schema.test.ts` (`'still allows organizationId to be null...'`) with:

```ts
  it('requires organizationId and enforces per-organization uniqueness', async () => {
    const orgA = await prisma.organization.create({ data: { name: 'Loja A', subdomain: 'loja-a' } });
    const orgB = await prisma.organization.create({ data: { name: 'Loja B', subdomain: 'loja-b' } });

    await prisma.category.create({
      data: { name: 'Bolos', slug: 'bolos', organizationId: orgA.id },
    });

    // Same slug in a different organization must be allowed.
    const categoryB = await prisma.category.create({
      data: { name: 'Bolos', slug: 'bolos', organizationId: orgB.id },
    });
    expect(categoryB.organizationId).toBe(orgB.id);

    // Same slug in the SAME organization must be rejected.
    await expect(
      prisma.category.create({
        data: { name: 'Bolos Duplicado', slug: 'bolos', organizationId: orgA.id },
      })
    ).rejects.toThrow();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/schema.test.ts`
Expected: FAIL — creating `categoryB` with the same slug as `orgA`'s category throws today, because `slug` is still globally `@unique`.

- [ ] **Step 3: Edit `prisma/schema.prisma`**

For each model below, change `organizationId String?` to `organizationId String` and `organization Organization?` to `organization Organization` (drop the `?` on both lines): `User`, `Category`, `Product`, `FillingOption`, `Customer`, `Quote`, `Order`, `Expense`, `FinancialTransaction`, `Setting`, `Testimonial`, `Ingredient`.

Then replace these standalone unique attributes with composite ones:

`Category` — change `slug String @unique` to `slug String`, and add at the end of the model body (before the closing `}`):
```prisma

  @@unique([organizationId, slug])
```

`Product` — change `slug String @unique` to `slug String`, add:
```prisma

  @@unique([organizationId, slug])
```

`Quote` — change `quoteNumber String @unique` to `quoteNumber String`, add:
```prisma

  @@unique([organizationId, quoteNumber])
```

`Order` — change `orderNumber String @unique` to `orderNumber String`, add:
```prisma

  @@unique([organizationId, orderNumber])
```

`Setting` — change `key String @unique` to `key String`, add:
```prisma

  @@unique([organizationId, key])
```

Leave `User.email @unique` as a **global** unique (not composite) — per the approved spec, a login email identifies exactly one user across the whole platform, and login resolves the user by email first, then checks their organization matches the subdomain.

- [ ] **Step 4: Push the schema**

```bash
npm run db:push
```
This will ask to confirm because `organizationId` is becoming required — since Task 3's backfill already ran against the dev database and every row has a non-null `organizationId`, this is safe. Accept the prompt.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/schema.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma tests/schema.test.ts
git commit -m "feat: require organizationId and scope unique constraints per-organization"
```

---

## Task 5: Tenant-scoped Prisma client (`getScopedPrisma`)

**Files:**
- Create: `src/lib/db.ts`
- Test: `tests/lib/db.test.ts`

**Interfaces:**
- Produces: `getScopedPrisma(organizationId: string)` from `src/lib/db.ts`, returning a Prisma Client Extension instance. Throws `Error` if `organizationId` is falsy. Every later task that reads/writes tenant-scoped data uses this instead of importing `prisma` from `src/lib/prisma.ts` directly.

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/db.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { resetTestDatabase } from '../helpers/testDb';
import { prisma } from '@/lib/prisma';
import { getScopedPrisma } from '@/lib/db';

describe('getScopedPrisma', () => {
  beforeEach(() => {
    resetTestDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('throws when called without an organizationId', () => {
    expect(() => getScopedPrisma('')).toThrow();
    // @ts-expect-error deliberately passing undefined
    expect(() => getScopedPrisma(undefined)).toThrow();
  });

  it('scopes reads and writes to the given organization', async () => {
    const orgA = await prisma.organization.create({ data: { name: 'Loja A', subdomain: 'loja-a' } });
    const orgB = await prisma.organization.create({ data: { name: 'Loja B', subdomain: 'loja-b' } });

    const dbA = getScopedPrisma(orgA.id);
    const dbB = getScopedPrisma(orgB.id);

    const categoryA = await dbA.category.create({ data: { name: 'Bolos', slug: 'bolos' } });

    // dbB must not see orgA's category, even by exact id.
    const foundInB = await dbB.category.findUnique({ where: { id: categoryA.id } });
    expect(foundInB).toBeNull();

    const listInB = await dbB.category.findMany();
    expect(listInB).toHaveLength(0);

    const listInA = await dbA.category.findMany();
    expect(listInA).toHaveLength(1);
    expect(listInA[0].organizationId).toBe(orgA.id);
  });

  it('does not scope models that are not tenant-scoped, like Organization itself', async () => {
    await prisma.organization.create({ data: { name: 'Loja A', subdomain: 'loja-a' } });
    const anotherOrg = await prisma.organization.create({ data: { name: 'Loja B', subdomain: 'loja-b' } });

    const dbForA = getScopedPrisma('some-org-id-not-in-db');
    // Organization is not in TENANT_SCOPED_MODELS, so this must pass through unfiltered.
    const orgs = await dbForA.organization.findMany();
    expect(orgs.length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/db.test.ts`
Expected: FAIL — cannot find module `@/lib/db`.

- [ ] **Step 3: Write `src/lib/db.ts`**

```ts
import { prisma } from './prisma';

const TENANT_SCOPED_MODELS = new Set([
  'Category',
  'Product',
  'FillingOption',
  'Customer',
  'Quote',
  'Order',
  'Expense',
  'FinancialTransaction',
  'Setting',
  'Testimonial',
  'Ingredient',
]);

const AUTO_WHERE_OPERATIONS = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findUnique',
  'findUniqueOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
]);

/**
 * Returns a Prisma client where every read/write against a tenant-scoped
 * model is automatically filtered/tagged with organizationId. `upsert` is
 * intentionally NOT auto-scoped — its `where` must reference a real unique
 * constraint (e.g. the compound organizationId_key on Setting), so callers
 * doing an upsert must build that where/data shape by hand.
 */
export function getScopedPrisma(organizationId: string) {
  if (!organizationId) {
    throw new Error('getScopedPrisma requires a non-empty organizationId');
  }

  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          if (AUTO_WHERE_OPERATIONS.has(operation)) {
            args.where = { ...(args.where ?? {}), organizationId };
          }

          if (operation === 'create' && args.data) {
            args.data = { ...args.data, organizationId };
          }

          if (operation === 'createMany' && Array.isArray(args.data)) {
            args.data = args.data.map((d: Record<string, unknown>) => ({ ...d, organizationId }));
          }

          return query(args);
        },
      },
    },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/db.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db.ts tests/lib/db.test.ts
git commit -m "feat: add tenant-scoped Prisma client extension"
```

---

## Task 6: Subdomain resolution — pure parser, `getCurrentOrganization`, middleware

**Files:**
- Create: `src/lib/tenant-subdomain.ts`
- Create: `src/lib/tenant.ts`
- Create: `src/middleware.ts`
- Test: `tests/lib/tenant-subdomain.test.ts`

**Interfaces:**
- Produces: `extractSubdomain(host: string, rootDomain: string): string | null` (pure, unit-tested). `getCurrentOrganization(): Promise<Organization | null>` (server-only, reads the `x-tenant-subdomain` header set by middleware). Every public-facing route added/edited in Tasks 9-15 calls `getCurrentOrganization()`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/tenant-subdomain.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/tenant-subdomain.test.ts`
Expected: FAIL — cannot find module `@/lib/tenant-subdomain`.

- [ ] **Step 3: Write `src/lib/tenant-subdomain.ts`**

```ts
export function extractSubdomain(host: string, rootDomain: string): string | null {
  const hostname = host.split(':')[0].toLowerCase();
  const root = rootDomain.toLowerCase();

  if (hostname === root || hostname === `www.${root}`) {
    return null;
  }

  const suffix = `.${root}`;
  if (!hostname.endsWith(suffix)) {
    return null;
  }

  const subdomain = hostname.slice(0, -suffix.length);
  if (!subdomain || subdomain.includes('.')) {
    return null;
  }

  return subdomain;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/tenant-subdomain.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Write `src/lib/tenant.ts`**

```ts
import { headers } from 'next/headers';
import { cache } from 'react';
import { prisma } from './prisma';

export const getCurrentOrganization = cache(async () => {
  const headerList = await headers();
  const subdomain = headerList.get('x-tenant-subdomain');
  if (!subdomain) return null;

  return prisma.organization.findUnique({ where: { subdomain } });
});
```

- [ ] **Step 6: Write `src/middleware.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { extractSubdomain } from '@/lib/tenant-subdomain';

const ROOT_DOMAIN = (process.env.ROOT_DOMAIN || 'localhost').split(':')[0];

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const subdomain = extractSubdomain(host, ROOT_DOMAIN);

  const requestHeaders = new Headers(request.headers);
  if (subdomain) {
    requestHeaders.set('x-tenant-subdomain', subdomain);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 7: Add `ROOT_DOMAIN` to local env and document local subdomain testing**

Add to `.env` (create it if it doesn't exist; do not commit real secrets — this repo's `.env` is already gitignored, verify with `git check-ignore .env` before committing anything):

```
ROOT_DOMAIN=localhost
```

- [ ] **Step 8: Manual smoke test of the middleware**

Middleware itself runs in the Edge runtime and isn't practically unit-testable with Vitest — verify it by hand:

1. Start the dev server: `npm run dev`
2. Note the port it prints (e.g. 3007).
3. Visit `http://cinthia.localhost:<port>/api/settings` in a browser (most modern browsers resolve `*.localhost` without any hosts-file entry).
4. Confirm the response is `200 OK` with a JSON body (empty object is fine at this stage — the route doesn't use the header yet, that's Task 14).
5. Add a temporary `console.log(request.headers.get('host'), subdomain)` in `middleware.ts`, reload, confirm the terminal prints `cinthia.localhost:<port> cinthia`, then remove the `console.log`.

- [ ] **Step 9: Commit**

```bash
git add src/lib/tenant-subdomain.ts src/lib/tenant.ts src/middleware.ts tests/lib/tenant-subdomain.test.ts .env.example
git commit -m "feat: resolve tenant organization from request subdomain"
```

(If `.env.example` doesn't exist yet, create it with just `ROOT_DOMAIN=localhost` — a template file, safe to commit, unlike `.env`.)

---

## Task 7: Auth — sessions and login carry `organizationId`

**Files:**
- Modify: `src/lib/auth.ts`
- Create: `src/lib/tenant-auth.ts`
- Modify: `src/app/api/auth/login/route.ts`
- Test: `tests/lib/tenant-auth.test.ts`

**Interfaces:**
- Consumes: `getCurrentOrganization()` from Task 6.
- Produces: `AuthSession` now includes `organizationId: string`. `userBelongsToOrganization(user, organizationId): boolean` from `src/lib/tenant-auth.ts`, used by the login route and reused by every admin route in Tasks 9-15 as `session.organizationId`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/tenant-auth.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/tenant-auth.test.ts`
Expected: FAIL — cannot find module `@/lib/tenant-auth`.

- [ ] **Step 3: Write `src/lib/tenant-auth.ts`**

```ts
export function userBelongsToOrganization(
  user: { organizationId: string },
  organizationId: string
): boolean {
  return user.organizationId === organizationId;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/tenant-auth.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Modify `src/lib/auth.ts`**

Change the `AuthSession` interface (around line 9):

```ts
export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
}
```

No other change is needed in this file — `createSession`, `getSession`, `verifyTokenFromReq`, `destroySession` already pass the whole session object through untouched.

- [ ] **Step 6: Modify `src/app/api/auth/login/route.ts`**

Replace the full file:

```ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/auth';
import { getCurrentOrganization } from '@/lib/tenant';
import { userBelongsToOrganization } from '@/lib/tenant-auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json(
        { error: 'Loja não encontrada.' },
        { status: 404 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !userBelongsToOrganization(user, organization.id)) {
      return NextResponse.json(
        { error: 'Credenciais inválidas.' },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Credenciais inválidas.' },
        { status: 401 }
      );
    }

    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Erro interno no servidor ao realizar login.' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/auth.ts src/lib/tenant-auth.ts src/app/api/auth/login/route.ts tests/lib/tenant-auth.test.ts
git commit -m "feat: scope login and sessions to a single organization"
```

---

## Task 8: Rewrite products routes

**Files:**
- Modify: `src/app/api/products/route.ts`
- Modify: `src/app/api/products/[id]/route.ts`

**Interfaces:**
- Consumes: `getScopedPrisma` (Task 5), `getCurrentOrganization` (Task 6), `getSession` (existing).

**Rule applied throughout Tasks 8-13:** wherever a handler already calls `getSession()` and 401s on a missing session, resolve the tenant from `session.organizationId`. Wherever a handler has no session check (public read, or public quote submission), resolve the tenant from `getCurrentOrganization()` and return 404 `{ error: 'Loja não encontrada.' }` if it's null.

- [ ] **Step 1: Replace `src/app/api/products/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getCurrentOrganization } from '@/lib/tenant';
import { getSession } from '@/lib/auth';
import { slugify } from '@/lib/utils';

export async function GET(request: Request) {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json({ error: 'Loja não encontrada.' }, { status: 404 });
    }
    const db = getScopedPrisma(organization.id);

    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get('category');
    const featuredOnly = searchParams.get('featured') === 'true';
    const activeOnly = searchParams.get('active') !== 'false';

    const whereClause: any = {};
    if (activeOnly) whereClause.active = true;
    if (featuredOnly) whereClause.featured = true;
    if (categorySlug) {
      whereClause.category = { slug: categorySlug };
    }

    const products = await db.product.findMany({
      where: whereClause,
      include: {
        category: true,
        variations: {
          where: { active: true },
          orderBy: { price: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const db = getScopedPrisma(session.organizationId);

    const body = await request.json();
    const { name, categoryId, description, mainImage, basePrice, unit, yieldInfo, featured, active, variations } = body;

    if (!name || !categoryId || !description || basePrice === undefined) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    let slug = slugify(name);
    const existingSlug = await db.product.findUnique({
      where: { organizationId_slug: { organizationId: session.organizationId, slug } },
    });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const product = await db.product.create({
      data: {
        name,
        slug,
        categoryId,
        description,
        mainImage: mainImage || '/cinthia/WhatsApp Image 2026-08-20 at 17.59.33.jpeg',
        basePrice: parseFloat(basePrice),
        unit: unit || 'unidade',
        yieldInfo: yieldInfo || null,
        featured: Boolean(featured),
        active: active !== undefined ? Boolean(active) : true,
        variations: {
          create: Array.isArray(variations)
            ? variations.map((v: any) => ({
                name: v.name,
                price: parseFloat(v.price),
                slices: v.slices || null,
                weight: v.weight || null,
                active: v.active !== undefined ? Boolean(v.active) : true,
              }))
            : [],
        },
      },
      include: {
        category: true,
        variations: true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Erro ao criar produto' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Replace `src/app/api/products/[id]/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getCurrentOrganization } from '@/lib/tenant';
import { getSession } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json({ error: 'Loja não encontrada.' }, { status: 404 });
    }
    const db = getScopedPrisma(organization.id);

    const { id } = await params;
    const product = await db.product.findUnique({
      where: { id },
      include: {
        category: true,
        variations: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar produto' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const db = getScopedPrisma(session.organizationId);

    const { id } = await params;
    const body = await request.json();

    const { name, categoryId, description, mainImage, basePrice, unit, yieldInfo, featured, active, variations } = body;

    if (Array.isArray(variations)) {
      await db.productVariation.deleteMany({
        where: { productId: id },
      });
    }

    const updatedProduct = await db.product.update({
      where: { id },
      data: {
        name,
        categoryId,
        description,
        mainImage,
        basePrice: parseFloat(basePrice),
        unit,
        yieldInfo,
        featured: Boolean(featured),
        active: Boolean(active),
        variations: Array.isArray(variations)
          ? {
              create: variations.map((v: any) => ({
                name: v.name,
                price: parseFloat(v.price),
                slices: v.slices || null,
                weight: v.weight || null,
                active: v.active !== undefined ? Boolean(v.active) : true,
              })),
            }
          : undefined,
      },
      include: {
        category: true,
        variations: true,
      },
    });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Erro ao atualizar produto' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const db = getScopedPrisma(session.organizationId);

    const { id } = await params;
    await db.product.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir produto' }, { status: 500 });
  }
}
```

Note: `productVariation.deleteMany({ where: { productId: id } })` is not auto-scoped (`ProductVariation` isn't in `TENANT_SCOPED_MODELS`), but `id` here is always a variation's `productId` that was itself just read/updated through the scoped `product` — a cross-tenant `id` guess can't reach this line, because the preceding `db.product.update({ where: { id } })` on the same request would already fail (P2025) for a foreign-tenant product id before this line's effects matter. No change needed.

- [ ] **Step 3: Verify the app still type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/products/route.ts src/app/api/products/\[id\]/route.ts
git commit -m "feat: scope products API routes to the current organization"
```

---

## Task 9: Rewrite categories and fillings routes

**Files:**
- Modify: `src/app/api/categories/route.ts`
- Modify: `src/app/api/fillings/route.ts`

- [ ] **Step 1: Replace `src/app/api/categories/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getCurrentOrganization } from '@/lib/tenant';
import { getSession } from '@/lib/auth';
import { slugify } from '@/lib/utils';

export async function GET() {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json({ error: 'Loja não encontrada.' }, { status: 404 });
    }
    const db = getScopedPrisma(organization.id);

    const categories = await db.category.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });
    return NextResponse.json(categories);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar categorias' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const db = getScopedPrisma(session.organizationId);

    const { name, description, order } = await request.json();
    if (!name) {
      return NextResponse.json({ error: 'Nome da categoria é obrigatório' }, { status: 400 });
    }

    let slug = slugify(name);
    const category = await db.category.create({
      data: {
        name,
        slug,
        description: description || null,
        order: order !== undefined ? parseInt(order) : 0,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar categoria' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Replace `src/app/api/fillings/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getCurrentOrganization } from '@/lib/tenant';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json({ error: 'Loja não encontrada.' }, { status: 404 });
    }
    const db = getScopedPrisma(organization.id);

    const fillings = await db.fillingOption.findMany({
      where: { active: true },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(fillings);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar recheios' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const db = getScopedPrisma(session.organizationId);

    const { name, category, extraPrice, description } = await request.json();
    if (!name) {
      return NextResponse.json({ error: 'Nome do recheio é obrigatório' }, { status: 400 });
    }

    const filling = await db.fillingOption.create({
      data: {
        name,
        category: category || 'Geral',
        extraPrice: extraPrice ? parseFloat(extraPrice) : 0,
        description: description || null,
      }
    });

    return NextResponse.json(filling, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar recheio' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/categories/route.ts src/app/api/fillings/route.ts
git commit -m "feat: scope categories and fillings API routes to the current organization"
```

---

## Task 10: Rewrite customers routes

**Files:**
- Modify: `src/app/api/customers/route.ts`
- Modify: `src/app/api/customers/[id]/route.ts`

- [ ] **Step 1: Replace `src/app/api/customers/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const customers = await db.customer.findMany({
      include: {
        _count: {
          select: { orders: true, quotes: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(customers);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar clientes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const body = await request.json();
    const { name, whatsapp, email, cpf, address, notes } = body;

    if (!name || !whatsapp) {
      return NextResponse.json({ error: 'Nome e WhatsApp são obrigatórios' }, { status: 400 });
    }

    const cleanPhone = whatsapp.replace(/\D/g, '');
    const customer = await db.customer.create({
      data: {
        name,
        whatsapp: cleanPhone,
        email: email || null,
        cpf: cpf || null,
        address: address || null,
        notes: notes || null,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao cadastrar cliente' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Replace `src/app/api/customers/[id]/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const { id } = await params;
    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        orders: {
          include: { items: true, payments: true },
          orderBy: { createdAt: 'desc' },
        },
        quotes: {
          include: { items: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    return NextResponse.json(customer);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar cliente' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const { id } = await params;
    const body = await request.json();

    const updatedCustomer = await db.customer.update({
      where: { id },
      data: {
        name: body.name,
        whatsapp: body.whatsapp ? body.whatsapp.replace(/\D/g, '') : undefined,
        email: body.email,
        cpf: body.cpf,
        address: body.address,
        notes: body.notes,
      },
    });

    return NextResponse.json(updatedCustomer);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar cliente' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const { id } = await params;
    await db.customer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir cliente' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/customers/route.ts src/app/api/customers/\[id\]/route.ts
git commit -m "feat: scope customers API routes to the current organization"
```

---

## Task 11: Rewrite orders routes

**Files:**
- Modify: `src/app/api/orders/route.ts`
- Modify: `src/app/api/orders/[id]/route.ts`

- [ ] **Step 1: Replace `src/app/api/orders/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const dateFilter = searchParams.get('date');

    const whereClause: any = {};
    if (statusFilter && statusFilter !== 'ALL') {
      whereClause.status = statusFilter;
    }
    if (dateFilter) {
      const targetDate = new Date(dateFilter);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      whereClause.deliveryDate = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const orders = await db.order.findMany({
      where: whereClause,
      include: {
        items: true,
        payments: true,
        customer: true,
      },
      orderBy: { deliveryDate: 'asc' },
    });

    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar pedidos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const body = await request.json();
    const { customerName, customerWhatsapp, deliveryDate, status, totalAmount, notes, items } = body;

    if (!customerName || !customerWhatsapp || !deliveryDate || !totalAmount) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }

    const cleanPhone = customerWhatsapp.replace(/\D/g, '');
    let customer = await db.customer.findFirst({ where: { whatsapp: cleanPhone } });
    if (!customer) {
      customer = await db.customer.create({
        data: { name: customerName, whatsapp: cleanPhone },
      });
    }

    const year = new Date().getFullYear();
    const prefix = `PED-${year}-`;
    const lastOrder = await db.order.findFirst({
      where: { orderNumber: { startsWith: prefix } },
      orderBy: { orderNumber: 'desc' },
    });

    let nextSeq = 1;
    if (lastOrder?.orderNumber) {
      const parts = lastOrder.orderNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }

    let orderNumber = `${prefix}${nextSeq.toString().padStart(4, '0')}`;
    while (
      await db.order.findUnique({
        where: { organizationId_orderNumber: { organizationId: session.organizationId, orderNumber } },
      })
    ) {
      nextSeq++;
      orderNumber = `${prefix}${nextSeq.toString().padStart(4, '0')}`;
    }

    const parsedTotal = parseFloat(totalAmount);
    const order = await db.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        customerName,
        customerWhatsapp: cleanPhone,
        deliveryDate: new Date(deliveryDate),
        status: status || 'NOVO',
        totalAmount: parsedTotal,
        paidAmount: 0.0,
        paymentStatus: 'PENDENTE',
        notes: notes || null,
        items: {
          create: Array.isArray(items)
            ? items.map((i: any) => ({
                productName: i.productName,
                variationName: i.variationName || null,
                cakeBase: i.cakeBase || null,
                filling1: i.filling1 || null,
                quantity: parseInt(i.quantity) || 1,
                unitPrice: parseFloat(i.unitPrice),
                totalPrice: parseFloat(i.totalPrice || i.unitPrice * i.quantity),
              }))
            : [],
        },
      },
      include: {
        items: true,
        payments: true,
      },
    });

    await db.customer.update({
      where: { id: customer.id },
      data: {
        ordersCount: { increment: 1 },
        totalSpent: { increment: parsedTotal },
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Erro ao criar pedido' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Replace `src/app/api/orders/[id]/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const { id } = await params;
    const order = await db.order.findUnique({
      where: { id },
      include: {
        items: true,
        payments: true,
        customer: true,
        quote: true,
      },
    });

    if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar pedido' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const { id } = await params;
    const body = await request.json();
    const { status, addPayment } = body;

    const existingOrder = await db.order.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!existingOrder) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });

    let updatedPaidAmount = existingOrder.paidAmount;
    let paymentStatus = existingOrder.paymentStatus;

    if (addPayment) {
      const paymentAmount = parseFloat(addPayment.amount);
      const paymentMethod = addPayment.paymentMethod || 'Pix';
      const notes = addPayment.notes || null;

      await db.payment.create({
        data: {
          orderId: id,
          amount: paymentAmount,
          paymentMethod,
          notes,
          status: 'CONFIRMADO',
        },
      });

      await db.financialTransaction.create({
        data: {
          type: 'RECEITA',
          amount: paymentAmount,
          category: 'Venda de Pedido',
          description: `Pagamento ${paymentMethod} do pedido ${existingOrder.orderNumber}`,
          orderId: id,
        },
      });

      updatedPaidAmount += paymentAmount;
      if (updatedPaidAmount >= existingOrder.totalAmount) {
        paymentStatus = 'PAGO';
      } else if (updatedPaidAmount > 0) {
        paymentStatus = 'PARCIAL';
      }
    }

    const updatedOrder = await db.order.update({
      where: { id },
      data: {
        status: status || existingOrder.status,
        paidAmount: updatedPaidAmount,
        paymentStatus,
        deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : existingOrder.deliveryDate,
        notes: body.notes !== undefined ? body.notes : existingOrder.notes,
      },
      include: {
        items: true,
        payments: true,
        customer: true,
      },
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Erro ao atualizar pedido' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const { id } = await params;
    await db.order.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir pedido' }, { status: 500 });
  }
}
```

Note: `db.payment.create` and `db.financialTransaction.create` — `Payment` isn't tenant-scoped (transitively scoped via `Order`), so it's created as-is. `FinancialTransaction` IS tenant-scoped, so `getScopedPrisma` auto-injects `organizationId` into its `create` call — no manual change needed there beyond using `db` instead of `prisma`.

- [ ] **Step 3: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/orders/route.ts src/app/api/orders/\[id\]/route.ts
git commit -m "feat: scope orders API routes to the current organization"
```

---

## Task 12: Rewrite quotes routes

**Files:**
- Modify: `src/app/api/quotes/route.ts`
- Modify: `src/app/api/quotes/[id]/route.ts`

**Note:** `quotes/route.ts`'s `POST` has no session check today — it's the public quote-submission endpoint the storefront calls. It must resolve the tenant from `getCurrentOrganization()`, not from a session.

- [ ] **Step 1: Replace `src/app/api/quotes/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getCurrentOrganization } from '@/lib/tenant';
import { getSession } from '@/lib/auth';
import { generateWhatsAppLink } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const db = getScopedPrisma(session.organizationId);

    const quotes = await db.quote.findMany({
      include: {
        items: true,
        customer: true,
        order: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(quotes);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar orçamentos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json({ error: 'Loja não encontrada.' }, { status: 404 });
    }
    const db = getScopedPrisma(organization.id);

    const body = await request.json();
    const {
      customerName,
      customerWhatsapp,
      customerEmail,
      customerBirthDate,
      lgpdAccepted,
      productName,
      variation,
      cakeBase,
      filling1,
      frosting,
      extras,
      quantity,
      unitPrice,
      eventDate,
      themeNotes,
      subtotal,
      extraTotal,
      finalTotal,
    } = body;

    const trimmedName = (customerName || '').trim();
    const cleanWhatsapp = (customerWhatsapp || '').replace(/\D/g, '');

    if (!trimmedName) {
      return NextResponse.json(
        { error: 'Por favor, informe seu Nome Completo.' },
        { status: 400 }
      );
    }

    if (!cleanWhatsapp || cleanWhatsapp.length < 10) {
      return NextResponse.json(
        { error: 'Por favor, informe um número de WhatsApp válido com DDD (ex: 11999998888).' },
        { status: 400 }
      );
    }

    if (!productName) {
      return NextResponse.json(
        { error: 'Por favor, selecione um produto para o orçamento.' },
        { status: 400 }
      );
    }

    const parsedBirthDate = customerBirthDate ? new Date(customerBirthDate) : null;

    let customer = await db.customer.findFirst({
      where: { whatsapp: cleanWhatsapp },
    });

    if (!customer) {
      customer = await db.customer.create({
        data: {
          name: customerName,
          whatsapp: cleanWhatsapp,
          email: customerEmail || null,
          birthDate: parsedBirthDate && !isNaN(parsedBirthDate.getTime()) ? parsedBirthDate : null,
          lgpdAccepted: lgpdAccepted !== undefined ? Boolean(lgpdAccepted) : true,
        },
      });
    } else {
      await db.customer.update({
        where: { id: customer.id },
        data: {
          name: customerName,
          email: customerEmail || customer.email,
          birthDate: parsedBirthDate && !isNaN(parsedBirthDate.getTime()) ? parsedBirthDate : customer.birthDate,
          lgpdAccepted: lgpdAccepted !== undefined ? Boolean(lgpdAccepted) : customer.lgpdAccepted,
        },
      });
    }

    const year = new Date().getFullYear();
    const prefix = `ORC-${year}-`;
    const lastQuote = await db.quote.findFirst({
      where: { quoteNumber: { startsWith: prefix } },
      orderBy: { quoteNumber: 'desc' },
    });

    let nextSeq = 1;
    if (lastQuote?.quoteNumber) {
      const parts = lastQuote.quoteNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }

    let quoteNumber = `${prefix}${nextSeq.toString().padStart(4, '0')}`;
    while (
      await db.quote.findUnique({
        where: { organizationId_quoteNumber: { organizationId: organization.id, quoteNumber } },
      })
    ) {
      nextSeq++;
      quoteNumber = `${prefix}${nextSeq.toString().padStart(4, '0')}`;
    }

    const parseEventDate = eventDate ? new Date(eventDate) : null;
    const isValidEventDate = parseEventDate && !isNaN(parseEventDate.getTime());
    const qty = parseInt(quantity) || 1;
    const price = parseFloat(unitPrice) || 0;
    const tot = parseFloat(finalTotal) || price * qty;

    const quote = await db.quote.create({
      data: {
        quoteNumber,
        customerId: customer.id,
        customerName,
        customerWhatsapp: cleanWhatsapp,
        eventDate: isValidEventDate ? parseEventDate : null,
        themeNotes: themeNotes || null,
        subtotal: parseFloat(subtotal) || price * qty,
        extraTotal: parseFloat(extraTotal) || 0,
        discount: 0,
        finalTotal: tot,
        status: 'PENDING',
        items: {
          create: [
            {
              productId: body.productId || 'custom',
              productName,
              variation: variation || null,
              cakeBase: cakeBase || null,
              filling1: filling1 || null,
              frosting: frosting || null,
              extras: extras || null,
              quantity: qty,
              unitPrice: price,
              totalPrice: tot,
            },
          ],
        },
      },
      include: {
        items: true,
      },
    });

    const waSetting = await db.setting.findUnique({
      where: { organizationId_key: { organizationId: organization.id, key: 'whatsapp_number' } },
    });
    const bakeryWhatsapp = waSetting?.value || '5512997594697';

    const formattedEventDate = isValidEventDate ? parseEventDate.toLocaleDateString('pt-BR') : undefined;
    const whatsappUrl = generateWhatsAppLink(bakeryWhatsapp, {
      quoteNumber: quote.quoteNumber,
      customerName,
      productName,
      variation,
      cakeBase,
      filling1,
      frosting,
      extras,
      quantity: qty,
      eventDate: formattedEventDate,
      themeNotes,
      finalTotal: tot,
    });

    return NextResponse.json({
      success: true,
      quote,
      whatsappUrl,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating quote:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao gerar orçamento.' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Replace `src/app/api/quotes/[id]/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getCurrentOrganization } from '@/lib/tenant';
import { getSession } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json({ error: 'Loja não encontrada.' }, { status: 404 });
    }
    const db = getScopedPrisma(organization.id);

    const { id } = await params;
    const quote = await db.quote.findUnique({
      where: { id },
      include: { items: true, customer: true, order: true },
    });

    if (!quote) return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 });
    return NextResponse.json(quote);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar orçamento' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const { id } = await params;
    const body = await request.json();
    const { status, convertToOrder } = body;

    const quote = await db.quote.findUnique({
      where: { id },
      include: { items: true, customer: true },
    });

    if (!quote) return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 });

    if (convertToOrder) {
      const year = new Date().getFullYear();
      const prefix = `PED-${year}-`;
      const lastOrder = await db.order.findFirst({
        where: { orderNumber: { startsWith: prefix } },
        orderBy: { orderNumber: 'desc' },
      });

      let nextSeq = 1;
      if (lastOrder?.orderNumber) {
        const parts = lastOrder.orderNumber.split('-');
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) {
          nextSeq = lastSeq + 1;
        }
      }

      let orderNumber = `${prefix}${nextSeq.toString().padStart(4, '0')}`;
      while (
        await db.order.findUnique({
          where: { organizationId_orderNumber: { organizationId: session.organizationId, orderNumber } },
        })
      ) {
        nextSeq++;
        orderNumber = `${prefix}${nextSeq.toString().padStart(4, '0')}`;
      }

      const deliveryDate = quote.eventDate || new Date(Date.now() + 86400000 * 3);

      const newOrder = await db.order.create({
        data: {
          orderNumber,
          quoteId: quote.id,
          customerId: quote.customerId,
          customerName: quote.customerName,
          customerWhatsapp: quote.customerWhatsapp,
          deliveryDate,
          status: 'NOVO',
          totalAmount: quote.finalTotal,
          paidAmount: 0.0,
          paymentStatus: 'PENDENTE',
          notes: quote.themeNotes,
          items: {
            create: quote.items.map((item) => ({
              productName: item.productName,
              variationName: item.variation,
              cakeBase: item.cakeBase,
              filling1: item.filling1,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            })),
          },
        },
      });

      if (quote.customerId) {
        await db.customer.update({
          where: { id: quote.customerId },
          data: {
            ordersCount: { increment: 1 },
            totalSpent: { increment: quote.finalTotal },
          },
        });
      }

      const updatedQuote = await db.quote.update({
        where: { id },
        data: { status: 'CONVERTED' },
        include: { items: true, order: true },
      });

      return NextResponse.json({
        success: true,
        message: 'Orçamento convertido em pedido com sucesso!',
        order: newOrder,
        quote: updatedQuote,
      });
    }

    const updatedQuote = await db.quote.update({
      where: { id },
      data: { status: status || quote.status },
      include: { items: true },
    });

    return NextResponse.json(updatedQuote);
  } catch (error) {
    console.error('Error updating quote:', error);
    return NextResponse.json({ error: 'Erro ao atualizar orçamento' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const { id } = await params;
    await db.quote.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir orçamento' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/quotes/route.ts src/app/api/quotes/\[id\]/route.ts
git commit -m "feat: scope quotes API routes to the current organization"
```

---

## Task 13: Rewrite settings and testimonials routes

**Files:**
- Modify: `src/app/api/settings/route.ts`
- Modify: `src/app/api/testimonials/route.ts`

- [ ] **Step 1: Replace `src/app/api/settings/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getCurrentOrganization } from '@/lib/tenant';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json({ error: 'Loja não encontrada.' }, { status: 404 });
    }
    const db = getScopedPrisma(organization.id);

    const settings = await db.setting.findMany();
    const settingsObject: Record<string, string> = {};
    settings.forEach((s) => {
      settingsObject[s.key] = s.value;
    });
    return NextResponse.json(settingsObject);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const body = await request.json();

    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string') {
        await db.setting.upsert({
          where: { organizationId_key: { organizationId: session.organizationId, key } },
          update: { value },
          create: { organizationId: session.organizationId, key, value },
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Configurações salvas com sucesso!' });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar configurações' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Replace `src/app/api/testimonials/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getCurrentOrganization } from '@/lib/tenant';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json({ error: 'Loja não encontrada.' }, { status: 404 });
    }
    const db = getScopedPrisma(organization.id);

    const testimonials = await db.testimonial.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(testimonials);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar depoimentos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const body = await request.json();
    const { name, eventType, comment, rating, active } = body;

    const testimonial = await db.testimonial.create({
      data: {
        name,
        eventType: eventType || 'Cliente',
        comment,
        rating: rating ? parseInt(rating) : 5,
        active: active !== undefined ? Boolean(active) : true,
      },
    });

    return NextResponse.json(testimonial, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar depoimento' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/settings/route.ts src/app/api/testimonials/route.ts
git commit -m "feat: scope settings and testimonials API routes to the current organization"
```

---

## Task 14: Rewrite finance and ingredients routes

**Files:**
- Modify: `src/app/api/finance/route.ts`
- Modify: `src/app/api/ingredients/route.ts`
- Modify: `src/app/api/ingredients/[id]/route.ts`

- [ ] **Step 1: Replace `src/app/api/finance/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'month';

    const now = new Date();
    let startDate = new Date();

    if (range === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (range === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (range === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (range === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      startDate = new Date(0);
    }

    const transactions = await db.financialTransaction.findMany({
      where: {
        date: { gte: startDate }
      },
      orderBy: { date: 'desc' },
      include: {
        order: true,
        expense: true,
      }
    });

    const expenses = await db.expense.findMany({
      where: {
        date: { gte: startDate }
      },
      orderBy: { date: 'desc' }
    });

    const orders = await db.order.findMany({
      where: {
        createdAt: { gte: startDate }
      }
    });

    const totalRevenue = transactions
      .filter((t) => t.type === 'RECEITA')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter((t) => t.type === 'DESPESA')
      .reduce((sum, t) => sum + t.amount, 0);

    const netProfit = totalRevenue - totalExpenses;

    const activeOrders = await db.order.findMany({
      where: {
        status: { notIn: ['ENTREGUE', 'CANCELADO'] }
      }
    });

    const accountsReceivable = activeOrders.reduce(
      (sum, o) => sum + (o.totalAmount - o.paidAmount),
      0
    );

    const paidOrdersTotal = orders
      .filter(o => o.paymentStatus === 'PAGO')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const averageTicket = orders.length > 0
      ? orders.reduce((sum, o) => sum + o.totalAmount, 0) / orders.length
      : 0;

    return NextResponse.json({
      range,
      metrics: {
        totalRevenue,
        totalExpenses,
        netProfit,
        accountsReceivable,
        paidOrdersTotal,
        averageTicket,
        totalOrders: orders.length,
      },
      transactions,
      expenses,
    });
  } catch (error) {
    console.error('Error fetching finance:', error);
    return NextResponse.json({ error: 'Erro ao carregar dados financeiros' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const body = await request.json();
    const { type, description, category, amount, paymentMethod, date, notes } = body;

    if (!description || !amount || !category) {
      return NextResponse.json({ error: 'Descrição, valor e categoria são obrigatórios' }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    const parsedDate = date ? new Date(date) : new Date();

    if (type === 'DESPESA') {
      const expense = await db.expense.create({
        data: {
          description,
          category,
          amount: parsedAmount,
          paymentMethod: paymentMethod || 'Pix',
          date: parsedDate,
          notes: notes || null,
        }
      });

      await db.financialTransaction.create({
        data: {
          type: 'DESPESA',
          amount: parsedAmount,
          category,
          description,
          date: parsedDate,
          expenseId: expense.id,
        }
      });

      return NextResponse.json(expense, { status: 201 });
    } else {
      const transaction = await db.financialTransaction.create({
        data: {
          type: 'RECEITA',
          amount: parsedAmount,
          category,
          description,
          date: parsedDate,
        }
      });

      return NextResponse.json(transaction, { status: 201 });
    }
  } catch (error) {
    console.error('Error creating financial record:', error);
    return NextResponse.json({ error: 'Erro ao registrar lançamento financeiro' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Replace `src/app/api/ingredients/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getCurrentOrganization } from '@/lib/tenant';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json({ error: 'Loja não encontrada.' }, { status: 404 });
    }
    const db = getScopedPrisma(organization.id);

    const ingredients = await db.ingredient.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(ingredients);
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    return NextResponse.json({ error: 'Erro ao buscar insumos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const db = getScopedPrisma(session.organizationId);

    const body = await request.json();
    const { name, unit, packageQuantity, costPrice, category } = body;

    if (!name || !packageQuantity || costPrice === undefined) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    const ingredient = await db.ingredient.create({
      data: {
        name,
        unit: unit || 'g',
        packageQuantity: parseFloat(packageQuantity),
        costPrice: parseFloat(costPrice),
        category: category || 'Ingredientes',
      },
    });

    return NextResponse.json(ingredient, { status: 201 });
  } catch (error) {
    console.error('Error creating ingredient:', error);
    return NextResponse.json({ error: 'Erro ao cadastrar insumo' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Replace `src/app/api/ingredients/[id]/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const db = getScopedPrisma(session.organizationId);

    const { id } = await context.params;
    const body = await request.json();
    const { name, unit, packageQuantity, costPrice, category } = body;

    const ingredient = await db.ingredient.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(unit && { unit }),
        ...(packageQuantity !== undefined && { packageQuantity: parseFloat(packageQuantity) }),
        ...(costPrice !== undefined && { costPrice: parseFloat(costPrice) }),
        ...(category && { category }),
      },
    });

    return NextResponse.json(ingredient);
  } catch (error) {
    console.error('Error updating ingredient:', error);
    return NextResponse.json({ error: 'Erro ao atualizar insumo' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const db = getScopedPrisma(session.organizationId);

    const { id } = await context.params;
    await db.ingredient.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting ingredient:', error);
    return NextResponse.json({ error: 'Erro ao excluir insumo' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/finance/route.ts src/app/api/ingredients/route.ts src/app/api/ingredients/\[id\]/route.ts
git commit -m "feat: scope finance and ingredients API routes to the current organization"
```

---

## Task 15: Verify the sweep is complete, update the seed script

**Files:**
- Modify: `prisma/seed.ts`
- Test: manual grep check (no new test file — this is a static verification)

**Interfaces:**
- Consumes: `backfillOrganization` (Task 3) is NOT used here — the seed script creates its own organization directly, since seeding is meant to set up a fresh dev database from scratch, not backfill an existing one.

- [ ] **Step 1: Grep for any remaining unscoped `prisma` usage in API routes**

Run: `grep -rl "from '@/lib/prisma'" src/app/api`
Expected output: exactly one file — `src/app/api/auth/login/route.ts`, which legitimately uses `prisma` directly for the global `user.findUnique({ where: { email } })` lookup, per Task 7. Every other route from Tasks 8-14 should now import from `@/lib/db` instead.

If the grep returns any file other than `src/app/api/auth/login/route.ts`, open it and apply the same `getScopedPrisma`/`getCurrentOrganization` pattern used in Tasks 8-14 before continuing.

- [ ] **Step 2: Replace `prisma/seed.ts`**

Add organization creation as the very first step, and scope every subsequent `create`/`upsert` call to it. Replace the full file:

```ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Confeitaria Cinthia Database...');

  // 0. Organization
  const organization = await prisma.organization.upsert({
    where: { subdomain: 'cinthia' },
    update: {},
    create: {
      name: 'Confeitaria Cinthia Rodrigues',
      subdomain: 'cinthia',
      status: 'ACTIVE',
    },
  });
  console.log('Organization ready:', organization.subdomain);

  // 1. Create Admin User
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cinthia.com' },
    update: {
      password: hashedPassword,
      organizationId: organization.id,
    },
    create: {
      email: 'admin@cinthia.com',
      name: 'Cinthia Rodrigues',
      password: hashedPassword,
      role: 'OWNER',
      organizationId: organization.id,
    },
  });
  console.log('Admin user created:', admin.email);

  // 2. Settings
  const settingsData = [
    { key: 'bakery_name', value: 'Cinthia Rodrigues - Confeitaria Artesanal' },
    { key: 'whatsapp_number', value: '5512997594697' },
    { key: 'instagram', value: '@crconfeitaria__' },
    { key: 'address', value: 'São Paulo - SP' },
    { key: 'welcome_message', value: 'Olá! Seja bem-vinda à Confeitaria Cinthia Rodrigues. Monte seu orçamento ou fale conosco!' },
    { key: 'min_lead_days', value: '3' },
  ];

  for (const s of settingsData) {
    await prisma.setting.upsert({
      where: { organizationId_key: { organizationId: organization.id, key: s.key } },
      update: { value: s.value },
      create: { ...s, organizationId: organization.id },
    });
  }

  // 3. Categories
  const catBolos = await prisma.category.upsert({
    where: { organizationId_slug: { organizationId: organization.id, slug: 'bolos' } },
    update: {},
    create: {
      name: 'Bolos Personalizados',
      slug: 'bolos',
      description: 'Bolos artesanais incríveis feitos com ingredientes selecionados.',
      order: 1,
      organizationId: organization.id,
    },
  });

  const catBiscoitos = await prisma.category.upsert({
    where: { organizationId_slug: { organizationId: organization.id, slug: 'biscoitos' } },
    update: {},
    create: {
      name: 'Biscoitos Amanteigados',
      slug: 'biscoitos',
      description: 'Biscoitos artesanais amanteigados, perfeitos para festas.',
      order: 2,
      organizationId: organization.id,
    },
  });

  const catKits = await prisma.category.upsert({
    where: { organizationId_slug: { organizationId: organization.id, slug: 'kits' } },
    update: {},
    create: {
      name: 'Kits & Festas',
      slug: 'kits',
      description: 'Kits especiais combinando bolo e biscoitos para sua festa.',
      order: 3,
      organizationId: organization.id,
    },
  });

  // 4. Products & Variations

  await prisma.product.upsert({
    where: { organizationId_slug: { organizationId: organization.id, slug: 'bento-cake' } },
    update: { mainImage: '/images/bento_cake.jpg' },
    create: {
      name: 'Bentô Cake',
      slug: 'bento-cake',
      categoryId: catBolos.id,
      description: 'Bentô Cake é um bolo personalizado na marmita. Ele tem 10 cm de diâmetro, pesa aproximadamente 450g e serve bem 2 pessoas. Possui 2 camadas de massa e 1 camada bem generosa de recheio. Embalado em hamburgueira biodegradável personalizada, acompanha colher de madeira e velinha.',
      mainImage: '/images/bento_cake.jpg',
      basePrice: 95.0,
      unit: 'unidade',
      yieldInfo: '10cm, ~450g (serve 2 pessoas)',
      active: true,
      featured: true,
      organizationId: organization.id,
      variations: {
        create: [
          { name: 'Bentô Cake Tradicional (10cm)', price: 95.0, weight: '450g', slices: '2 fatias' },
        ]
      }
    },
  });

  await prisma.product.upsert({
    where: { organizationId_slug: { organizationId: organization.id, slug: 'mini-bolo' } },
    update: { mainImage: '/images/mini_bolo.jpg' },
    create: {
      name: 'Mini Bolo Artesanal',
      slug: 'mini-bolo',
      categoryId: catBolos.id,
      description: 'Bolo encantador ideal para pequenas celebrações e fotos especiais. Rende aproximadamente 7 fatias com massas de baunilha ou chocolate e recheios generosos.',
      mainImage: '/images/mini_bolo.jpg',
      basePrice: 110.0,
      unit: 'unidade',
      yieldInfo: 'Aproximadamente 7 fatias',
      active: true,
      featured: true,
      organizationId: organization.id,
      variations: {
        create: [
          { name: 'Cobertura em Chantily', price: 110.0, slices: '7 fatias' },
          { name: 'Cobertura em Buttercream', price: 130.0, slices: '7 fatias' },
        ]
      }
    },
  });

  await prisma.product.upsert({
    where: { organizationId_slug: { organizationId: organization.id, slug: 'bolos-redondos' } },
    update: { mainImage: '/images/bolo_redondo.jpg' },
    create: {
      name: 'Bolos Redondos Personalizados',
      slug: 'bolos-redondos',
      categoryId: catBolos.id,
      description: 'Bolos redondos altos, super recheados e decorados com técnica artesanal refinada. Escolha a quantidade de fatias e o seu recheio favorito.',
      mainImage: '/images/bolo_redondo.jpg',
      basePrice: 125.0,
      unit: 'unidade',
      yieldInfo: 'De 9 a 24 fatias',
      active: true,
      featured: true,
      organizationId: organization.id,
      variations: {
        create: [
          { name: '09 a 11 Fatias', price: 125.0, slices: '09-11 fatias' },
          { name: '13 a 15 Fatias', price: 155.0, slices: '13-15 fatias' },
          { name: '17 a 19 Fatias', price: 185.0, slices: '17-19 fatias' },
          { name: '20 a 24 Fatias', price: 235.0, slices: '20-24 fatias' },
        ]
      }
    },
  });

  await prisma.product.upsert({
    where: { organizationId_slug: { organizationId: organization.id, slug: 'bolos-retangulares' } },
    update: { mainImage: '/images/bolo_retangular.jpg' },
    create: {
      name: 'Bolos Retangulares',
      slug: 'bolos-retangulares',
      categoryId: catBolos.id,
      description: 'Perfeitos para grandes eventos, aniversários e festas de família. Excelente rendimento com o sabor inconfundível da confeitaria artesanal.',
      mainImage: '/images/bolo_retangular.jpg',
      basePrice: 145.0,
      unit: 'unidade',
      yieldInfo: 'De 13 a 60 fatias',
      active: true,
      featured: false,
      organizationId: organization.id,
      variations: {
        create: [
          { name: '13 a 15 Fatias', price: 145.0, slices: '13-15 fatias' },
          { name: '20 a 24 Fatias', price: 235.0, slices: '20-24 fatias' },
          { name: '35 a 40 Fatias', price: 265.0, slices: '35-40 fatias' },
          { name: '55 a 60 Fatias', price: 325.0, slices: '55-60 fatias' },
        ]
      }
    },
  });

  await prisma.product.upsert({
    where: { organizationId_slug: { organizationId: organization.id, slug: 'biscoitos-amanteigados' } },
    update: { mainImage: '/images/biscoitos_amanteigados.jpg' },
    create: {
      name: 'Biscoitos Amanteigados Personalizados',
      slug: 'biscoitos-amanteigados',
      categoryId: catBiscoitos.id,
      description: 'Biscoitos amanteigados crocantes e delicados, decorados artesanalmente com glacê real no tema da sua festa.',
      mainImage: '/images/biscoitos_amanteigados.jpg',
      basePrice: 5.0,
      unit: 'unidade',
      yieldInfo: 'Tamanhos de 4cm a 9cm',
      active: true,
      featured: true,
      organizationId: organization.id,
      variations: {
        create: [
          { name: 'Biscoitos 4cm (4 desenhos) - Mínimo 20 un.', price: 5.0, slices: '4cm' },
          { name: 'Biscoitos 6cm (5 desenhos) - Mínimo 10 un.', price: 11.90, slices: '6cm' },
          { name: 'Biscoitos 9cm (4 desenhos) - Mínimo 4 un.', price: 21.90, slices: '9cm' },
        ]
      }
    },
  });

  await prisma.product.upsert({
    where: { organizationId_slug: { organizationId: organization.id, slug: 'kit-festa-celebrar' } },
    update: { mainImage: '/images/bento_cake.jpg' },
    create: {
      name: 'Kit Festa Celebrar (Bentô Cake + Biscoitos)',
      slug: 'kit-festa-celebrar',
      categoryId: catKits.id,
      description: 'Combo perfeito para comemorações! Acompanha 1 Bentô Cake artesanal com cobertura em Buttercream + Biscoitos Amanteigados desenhados no tema da festa.',
      mainImage: '/images/bento_cake.jpg',
      basePrice: 160.0,
      unit: 'kit',
      yieldInfo: 'Bentô Cake + Biscoitos Decorados',
      active: true,
      featured: true,
      organizationId: organization.id,
      variations: {
        create: [
          { name: '10 biscoitos de 6cm (Bentô Cake + 10 Biscoitos 6cm)', price: 160.0, weight: '450g + 10 biscoitos', slices: '2 fatias + biscoitos' },
          { name: '5 biscoitos de 9cm (sendo 1 no palito) (Bentô Cake + 5 Biscoitos 9cm)', price: 160.0, weight: '450g + 5 biscoitos', slices: '2 fatias + biscoitos' },
        ]
      }
    },
  });

  // 5. Official Fillings Options (Full 20-flavor Menu)
  await prisma.fillingOption.deleteMany({ where: { organizationId: organization.id } });

  const fillings = [
    { name: 'Alpino', category: 'Chocolates' },
    { name: 'Beijinho com Abacaxi', category: 'Frutas & Coco' },
    { name: 'Beijinho com Morangos', category: 'Frutas & Coco' },
    { name: 'Brigadeiro Gourmet com Bombom Sonho de Valsa', category: 'Especiais' },
    { name: 'Brigadeiro Gourmet com Bombom Ouro Branco', category: 'Especiais' },
    { name: 'Brigadeiro Gourmet com Morangos', category: 'Frutas' },
    { name: 'Brigadeiro Quatro Leites com Frutas Amarelas', category: 'Frutas' },
    { name: 'Brigadeiro Quatro Leites com Frutas Vermelhas', category: 'Frutas' },
    { name: 'Brigadeiro Quatro Leites com Morangos', category: 'Frutas' },
    { name: 'Brigadeiro de Nutella com Nozes', category: 'Nobre' },
    { name: 'Doce de Leite com Ameixa', category: 'Doce de Leite' },
    { name: 'Doce de Leite com Compota de Abacaxi', category: 'Doce de Leite' },
    { name: 'Doce de Leite com Coco', category: 'Doce de Leite' },
    { name: 'Doce de Leite com Praliné de Nozes', category: 'Doce de Leite' },
    { name: 'Ninho', category: 'Clássicos' },
    { name: 'Ninho com Abacaxi', category: 'Frutas' },
    { name: 'Ninho com Morangos', category: 'Frutas' },
    { name: 'Ninho Trufado', category: 'Clássicos' },
    { name: 'Ninho com Nutella', category: 'Gourmet' },
    { name: 'Prestígio', category: 'Clássicos' },
  ];

  for (const f of fillings) {
    await prisma.fillingOption.create({
      data: {
        name: f.name,
        category: f.category,
        extraPrice: 0.0,
        active: true,
        organizationId: organization.id,
      }
    });
  }

  // 6. Initial Ingredients for Dynamic Pricing
  const ingredientsData = [
    { name: 'Leite Condensado (Moça / Itambé)', unit: 'g', packageQuantity: 395, costPrice: 7.50, category: 'Laticínios' },
    { name: 'Creme de Leite 20%', unit: 'g', packageQuantity: 200, costPrice: 4.20, category: 'Laticínios' },
    { name: 'Manteiga Extra Sem Sal', unit: 'g', packageQuantity: 200, costPrice: 14.00, category: 'Laticínios' },
    { name: 'Chocolate Nobre 50% Callebaut', unit: 'g', packageQuantity: 1000, costPrice: 85.00, category: 'Chocolates' },
    { name: 'Farinha de Trigo Premium', unit: 'g', packageQuantity: 1000, costPrice: 6.00, category: 'Secos' },
    { name: 'Açúcar Refinado / Impalpável', unit: 'g', packageQuantity: 1000, costPrice: 4.80, category: 'Secos' },
    { name: 'Ovos Médios', unit: 'un', packageQuantity: 30, costPrice: 18.00, category: 'Frescos' },
    { name: 'Chantilly Amélia / Supreme', unit: 'ml', packageQuantity: 1000, costPrice: 22.00, category: 'Coberturas' },
    { name: 'Caixa & Embalagem Decorativa', unit: 'un', packageQuantity: 1, costPrice: 5.50, category: 'Embalagens' },
  ];

  for (const ing of ingredientsData) {
    const existing = await prisma.ingredient.findFirst({
      where: { name: ing.name, organizationId: organization.id },
    });
    if (!existing) {
      await prisma.ingredient.create({ data: { ...ing, organizationId: organization.id } });
    }
  }

  // 7. Testimonials
  const testimonials = [
    {
      name: 'Mariana Silva',
      eventType: 'Aniversário Infantil',
      comment: 'O bolo de Ninho com Morangos estava divino e super delicado! Todos os convidados elogiaram muito.',
      rating: 5,
    },
    {
      name: 'Camila Rocha',
      eventType: 'Mesversário',
      comment: 'Os biscoitos personalizados do Bentô Cake superaram minhas expectativas. Dá até pena de comer de tão lindo!',
      rating: 5,
    },
    {
      name: 'Fernanda Lima',
      eventType: 'Casamento',
      comment: 'Atendimento impecável via WhatsApp e a entrega foi super pontual. O bolo retangular rendeu maravilhosamente.',
      rating: 5,
    }
  ];

  for (const t of testimonials) {
    const existing = await prisma.testimonial.findFirst({
      where: { name: t.name, organizationId: organization.id },
    });
    if (!existing) {
      await prisma.testimonial.create({ data: { ...t, organizationId: organization.id } });
    }
  }

  // 8. Seed Initial Customer and Sample Order for Dashboard metrics
  const sampleCustomer = await prisma.customer.create({
    data: {
      name: 'Maria Oliveira',
      whatsapp: '5511988887777',
      email: 'maria@gmail.com',
      notes: 'Cliente preferencial, gosta de massa de baunilha.',
      totalSpent: 420.0,
      ordersCount: 2,
      organizationId: organization.id,
    }
  });

  const sampleOrder = await prisma.order.upsert({
    where: { organizationId_orderNumber: { organizationId: organization.id, orderNumber: 'PED-2026-0001' } },
    update: {},
    create: {
      orderNumber: 'PED-2026-0001',
      customerId: sampleCustomer.id,
      customerName: sampleCustomer.name,
      customerWhatsapp: sampleCustomer.whatsapp,
      deliveryDate: new Date(Date.now() + 86400000 * 3),
      status: 'CONFIRMADO',
      totalAmount: 235.0,
      paidAmount: 120.0,
      paymentStatus: 'PARCIAL',
      notes: 'Entregar às 15h. Tema: Jardim Encantado',
      organizationId: organization.id,
      items: {
        create: [
          {
            productName: 'Bolos Redondos Personalizados',
            variationName: '20 a 24 Fatias',
            cakeBase: 'Baunilha',
            filling1: 'Ninho com Morangos',
            quantity: 1,
            unitPrice: 235.0,
            totalPrice: 235.0,
          }
        ]
      },
      payments: {
        create: [
          {
            amount: 120.0,
            paymentMethod: 'Pix',
            status: 'CONFIRMADO',
            notes: 'Sinal de 50%'
          }
        ]
      }
    }
  });

  await prisma.financialTransaction.create({
    data: {
      type: 'RECEITA',
      amount: 120.0,
      category: 'Venda de Pedido',
      description: 'Sinal Pix Pedido PED-2026-0001',
      orderId: sampleOrder.id,
      organizationId: organization.id,
    }
  });

  const sampleExpense = await prisma.expense.create({
    data: {
      description: 'Compra de Embalagens e caixas para bolos',
      category: 'Embalagens',
      amount: 85.0,
      paymentMethod: 'Pix',
      notes: 'Fornecedor Embalagens SP',
      organizationId: organization.id,
    }
  });

  await prisma.financialTransaction.create({
    data: {
      type: 'DESPESA',
      amount: 85.0,
      category: 'Embalagens',
      description: 'Compra de Embalagens e caixas para bolos',
      expenseId: sampleExpense.id,
      organizationId: organization.id,
    }
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 3: Run the seed script against the test database to confirm it's error-free**

```bash
DATABASE_URL="file:./prisma/test.db" npx prisma db push --skip-generate --accept-data-loss
DATABASE_URL="file:./prisma/test.db" npx tsx prisma/seed.ts
```
Expected: no errors, ends with the "Seed script updated..." log line (or further seed output if you completed the rest of the file).

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: scope the seed script to the Confeitaria Cinthia organization"
```

---

## Task 16: Cross-tenant isolation integration test

**Files:**
- Create: `tests/integration/tenant-isolation.test.ts`

**Interfaces:**
- Consumes: `getScopedPrisma` (Task 5), `backfillOrganization`'s pattern (Task 3) for creating a second org directly.

- [ ] **Step 1: Write the test**

```ts
// tests/integration/tenant-isolation.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { resetTestDatabase } from '../helpers/testDb';
import { prisma } from '@/lib/prisma';
import { getScopedPrisma } from '@/lib/db';

describe('cross-tenant data isolation', () => {
  beforeEach(() => {
    resetTestDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('keeps every tenant-scoped model isolated between two organizations', async () => {
    const orgA = await prisma.organization.create({ data: { name: 'Loja A', subdomain: 'loja-a' } });
    const orgB = await prisma.organization.create({ data: { name: 'Loja B', subdomain: 'loja-b' } });

    const dbA = getScopedPrisma(orgA.id);
    const dbB = getScopedPrisma(orgB.id);

    const category = await dbA.category.create({ data: { name: 'Bolos', slug: 'bolos' } });
    await dbA.product.create({
      data: {
        name: 'Bolo de Chocolate',
        slug: 'bolo-de-chocolate',
        categoryId: category.id,
        description: 'Delicioso',
        mainImage: '/img.jpg',
        basePrice: 100,
      },
    });
    await dbA.customer.create({ data: { name: 'Cliente A', whatsapp: '11999990000' } });
    await dbA.fillingOption.create({ data: { name: 'Ninho' } });
    await dbA.testimonial.create({ data: { name: 'Fulana', eventType: 'Aniversário', comment: 'Ótimo!' } });
    await dbA.ingredient.create({ data: { name: 'Farinha', packageQuantity: 1000, costPrice: 5 } });
    await dbA.setting.create({ data: { key: 'whatsapp_number', value: '5511999990000' } });

    expect(await dbB.category.findMany()).toHaveLength(0);
    expect(await dbB.product.findMany()).toHaveLength(0);
    expect(await dbB.customer.findMany()).toHaveLength(0);
    expect(await dbB.fillingOption.findMany()).toHaveLength(0);
    expect(await dbB.testimonial.findMany()).toHaveLength(0);
    expect(await dbB.ingredient.findMany()).toHaveLength(0);
    expect(await dbB.setting.findMany()).toHaveLength(0);

    expect(await dbA.category.findMany()).toHaveLength(1);
    expect(await dbA.product.findMany()).toHaveLength(1);
    expect(await dbA.customer.findMany()).toHaveLength(1);
  });

  it('lets two organizations reuse the same customer WhatsApp number as distinct customers', async () => {
    const orgA = await prisma.organization.create({ data: { name: 'Loja A', subdomain: 'loja-a' } });
    const orgB = await prisma.organization.create({ data: { name: 'Loja B', subdomain: 'loja-b' } });

    const dbA = getScopedPrisma(orgA.id);
    const dbB = getScopedPrisma(orgB.id);

    await dbA.customer.create({ data: { name: 'Cliente da Loja A', whatsapp: '11999990000' } });
    await dbB.customer.create({ data: { name: 'Cliente da Loja B', whatsapp: '11999990000' } });

    const foundByA = await dbA.customer.findFirst({ where: { whatsapp: '11999990000' } });
    const foundByB = await dbB.customer.findFirst({ where: { whatsapp: '11999990000' } });

    expect(foundByA?.name).toBe('Cliente da Loja A');
    expect(foundByB?.name).toBe('Cliente da Loja B');
  });

  it('lets two organizations independently sequence their own quote numbers', async () => {
    const orgA = await prisma.organization.create({ data: { name: 'Loja A', subdomain: 'loja-a' } });
    const orgB = await prisma.organization.create({ data: { name: 'Loja B', subdomain: 'loja-b' } });

    const dbA = getScopedPrisma(orgA.id);
    const dbB = getScopedPrisma(orgB.id);

    const quoteDataFor = (orgId: string) => ({
      quoteNumber: 'ORC-2026-0001',
      customerName: 'Cliente',
      customerWhatsapp: '11999990000',
      subtotal: 100,
      finalTotal: 100,
    });

    const quoteA = await dbA.quote.create({ data: quoteDataFor(orgA.id) });
    const quoteB = await dbB.quote.create({ data: quoteDataFor(orgB.id) });

    expect(quoteA.quoteNumber).toBe('ORC-2026-0001');
    expect(quoteB.quoteNumber).toBe('ORC-2026-0001');
    expect(quoteA.organizationId).toBe(orgA.id);
    expect(quoteB.organizationId).toBe(orgB.id);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npm test -- tests/integration/tenant-isolation.test.ts`
Expected: PASS, 3 tests. If any fail, the failure points to exactly which route/model rewrite in Tasks 8-15 missed the scoping — fix it there, not in this test.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: every test file passes.

- [ ] **Step 4: Commit**

```bash
git add tests/integration/tenant-isolation.test.ts
git commit -m "test: verify cross-tenant data isolation end-to-end"
```

---

## Task 17: Provision Supabase Postgres and switch the datasource

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `.env` (not committed) / `.env.example`

**This task requires a real Supabase account action — it cannot be scripted.**

- [ ] **Step 1: Create the Supabase project**

1. Go to https://supabase.com/dashboard and sign in (or use the Supabase CLI/MCP integration already installed in this environment, if authenticated).
2. Create a new project, e.g. named `confeitaria-cinthia-saas`. Choose a region close to Brazil (e.g. `sa-east-1` / São Paulo, if offered).
3. Once provisioned, go to Project Settings → Database → Connection String, and copy the **URI** connection string (use the "Connection pooling" string for the app, on port 6543, with `?pgbouncer=true` — Prisma needs this for serverless-friendly pooled connections).

- [ ] **Step 2: Add the connection string to `.env`**

```
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@<region>.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<project-ref>:<password>@<region>.pooler.supabase.com:5432/postgres"
```

`DIRECT_URL` is a **non-pooled** connection, needed for `prisma db push` (schema changes must go through the direct connection, not the pgbouncer pool).

- [ ] **Step 3: Update `prisma/schema.prisma`'s datasource block**

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

- [ ] **Step 4: Push the schema to the new Postgres database**

```bash
npx prisma db push
```
Expected: all 18 tables created in the empty Supabase database, no errors.

- [ ] **Step 5: Verify with a throwaway smoke script**

```bash
npx tsx -e "
import { prisma } from './src/lib/prisma';
prisma.organization.create({ data: { name: 'Smoke Test', subdomain: 'smoke-test' } })
  .then((org) => { console.log('Created:', org); return prisma.organization.delete({ where: { id: org.id } }); })
  .then(() => console.log('Deleted OK — Postgres connection works.'))
  .finally(() => prisma.\$disconnect());
"
```
Expected: prints "Created: ..." then "Deleted OK — Postgres connection works."

- [ ] **Step 6: Update `.env.example`**

```
DATABASE_URL="postgresql://user:password@host:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://user:password@host:5432/postgres"
ROOT_DOMAIN=localhost
```

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma .env.example
git commit -m "feat: switch datasource from SQLite to Postgres (Supabase)"
```

Do not commit `.env` — confirm it's gitignored first: `git check-ignore .env` should print `.env`.

---

## Task 18: Migrate existing SQLite data into Postgres

**Files:**
- Create: `prisma/scripts/export-sqlite-data.ts`
- Create: `prisma/scripts/import-postgres-data.ts`

**Interfaces:**
- Produces: a `prisma/data-export.json` file (gitignored) as the handoff artifact between the two scripts.

- [ ] **Step 1: Add `prisma/data-export.json` to `.gitignore`**

- [ ] **Step 2: Write `prisma/scripts/export-sqlite-data.ts`**

Run this against a checkout of the code **before** Task 17's datasource change (or temporarily point `DATABASE_URL` at the old `file:./prisma/dev.db` with a schema.prisma that still says `provider = "sqlite"` — easiest is to run it from git history: `git show HEAD~<N>:prisma/schema.prisma` at the commit right before Task 17, or simply keep a copy of the SQLite-provider schema file handy). To keep this mechanical, run it right before Task 17's Step 3 (schema datasource swap), while `DATABASE_URL` is still unset (falls back to `file:./prisma/dev.db` per `src/lib/prisma.ts`).

```ts
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const EXPORT_MODELS = [
  'organization',
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

async function main() {
  const data: Record<string, unknown[]> = {};

  for (const model of EXPORT_MODELS) {
    // @ts-expect-error dynamic model access
    data[model] = await prisma[model].findMany();
    console.log(`Exported ${data[model].length} rows from ${model}`);
  }

  const outPath = path.join(process.cwd(), 'prisma', 'data-export.json');
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`Wrote ${outPath}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 3: Run the export BEFORE switching the datasource**

If you've already completed Task 17, temporarily revert `prisma/schema.prisma`'s datasource block to SQLite (`git stash` your Task 17 changes, or check out the pre-Task-17 version of just that block) and regenerate the client:

```bash
git stash
npx prisma generate
npx tsx prisma/scripts/export-sqlite-data.ts
git stash pop
npx prisma generate
```
Expected: `prisma/data-export.json` created, with a row count logged per model matching what you'd expect for the single Cinthia organization's data.

- [ ] **Step 4: Write `prisma/scripts/import-postgres-data.ts`**

```ts
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
```

- [ ] **Step 5: Run the import against Postgres**

Make sure `prisma/schema.prisma` is back on `provider = "postgresql"` (Task 17's state) and `DATABASE_URL`/`DIRECT_URL` are set, then:

```bash
npx prisma generate
npx tsx prisma/scripts/import-postgres-data.ts
```
Expected: a row count logged per model, no foreign key errors (if you see one, it means `IMPORT_ORDER` needs a parent moved earlier — fix the order and re-run against a freshly-pushed empty schema).

- [ ] **Step 6: Verify the migrated data**

```bash
npx tsx -e "
import { prisma } from './src/lib/prisma';
prisma.organization.findUnique({ where: { subdomain: 'cinthia' }, include: { _count: true } })
  .then((org) => console.log('Cinthia org in Postgres:', org))
  .finally(() => prisma.\$disconnect());
"
```
Expected: prints the Cinthia organization record (non-null).

- [ ] **Step 7: Commit**

```bash
git add prisma/scripts/export-sqlite-data.ts prisma/scripts/import-postgres-data.ts .gitignore
git commit -m "feat: add SQLite-to-Postgres data migration scripts, migrate Cinthia's data"
```

---

## Task 19: Remove SQLite-specific code, final regression pass

**Files:**
- Modify: `src/lib/prisma.ts`
- Modify: `next.config.js`

- [ ] **Step 1: Simplify `src/lib/prisma.ts`**

The `getDatabaseUrl()` writable-file/serverless-tmp-copy logic existed only to work around SQLite being a single file that needs write permissions and doesn't survive serverless cold starts. Postgres has none of these problems. Replace the full file:

```ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

- [ ] **Step 2: Simplify `next.config.js`**

Remove the `outputFileTracingIncludes` block that bundled `prisma/dev.db` — it no longer exists as a runtime dependency:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
```

- [ ] **Step 3: Run the full automated test suite one more time**

Note: `tests/helpers/testDb.ts`'s `resetTestDatabase()` still targets a SQLite file — that's fine, it's an isolated throwaway test database unrelated to the app's real Postgres database, and keeping tests on SQLite keeps them fast and hermetic. No change needed there.

Run: `npm test`
Expected: every test still passes (this task didn't touch any tenant-scoping logic, only cleaned up SQLite-only plumbing).

- [ ] **Step 4: Manual end-to-end regression smoke test against Postgres**

1. `npm run dev`, note the port.
2. Visit `http://cinthia.localhost:<port>` — confirm the storefront loads with Cinthia's real product catalog (migrated data).
3. Go through the budget calculator (`BudgetCalculatorModal`) for a "Bolos Retangulares" product, submit a quote — confirm it succeeds and the WhatsApp link opens with the correct quote number format (`ORC-2026-XXXX`).
4. Log into `http://cinthia.localhost:<port>/admin/login` with `admin@cinthia.com` / the seeded/real password — confirm login works and the dashboard shows the migrated orders/quotes/customers.
5. In `/admin/orcamentos`, convert a pending quote into an order — confirm it succeeds and a new `PED-2026-XXXX` order appears in `/admin/pedidos`.
6. In `/admin/financeiro`, confirm existing financial transactions/expenses are visible with correct totals.
7. Try `http://uma-loja-que-nao-existe.localhost:<port>` — confirm it returns a 404 rather than another tenant's data or a crash.

- [ ] **Step 5: Commit**

```bash
git add src/lib/prisma.ts next.config.js
git commit -m "chore: remove SQLite-specific workarounds now that the datasource is Postgres"
```

---

## Self-Review Notes

- **Spec coverage:** every section of `2026-08-25-multi-tenant-foundation-design.md` maps to a task — data model (Tasks 2, 4), routing/tenant resolution (Task 6), auth/isolation (Tasks 5, 7), the ~15-route mechanical sweep (Tasks 8-14, verified in Task 15), migration plan (Tasks 2-3, 17-18), and testing strategy (Task 1 harness, Task 5/16 isolation tests, Task 19 manual regression).
- **Not covered here, by design:** onboarding UI for new tenants, billing, white-labeling, and any visual redesign — those are separate future plans per the roadmap in the spec.
- **Known follow-up, not blocking:** `src/app/api/quotes/[id]/route.ts` GET and `src/app/api/ingredients/route.ts` GET have no session check today (pre-existing behavior, unrelated to this plan) — this plan preserves that behavior exactly while adding tenant scoping via subdomain, rather than tightening authorization requirements that weren't part of the approved spec.
