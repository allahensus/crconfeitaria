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
  'BlockedDate',
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
 *
 * Known limitation: this only scopes which *rows* a query can read/write by
 * organizationId — it does NOT validate that a foreign key referenced in a
 * create/update (e.g. `categoryId` on a `Product`) actually belongs to the
 * same organization. Routes that accept a foreign-tenant-owned ID in the
 * request body must validate it themselves. This is a known, accepted
 * limitation for now (documented, not fixed in this pass) since only one
 * real tenant exists today.
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

          const scopedArgs = args as any;

          if (AUTO_WHERE_OPERATIONS.has(operation)) {
            scopedArgs.where = { ...(scopedArgs.where ?? {}), organizationId };
          }

          if (operation === 'create' && scopedArgs.data) {
            scopedArgs.data = { ...scopedArgs.data, organizationId };
          }

          if (operation === 'createMany' && Array.isArray(scopedArgs.data)) {
            scopedArgs.data = scopedArgs.data.map((d: Record<string, unknown>) => ({ ...d, organizationId }));
          }

          return query(scopedArgs);
        },
      },
    },
  });
}
