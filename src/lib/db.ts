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
