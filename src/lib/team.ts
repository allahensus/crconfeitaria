// Shared last-owner guard for team management (/api/team/[id]) -- an
// organization must always keep at least one OWNER, or it locks itself out
// of Financeiro, Cupons and Equipe with no in-app way back in. Extracted so
// this logic can be tested directly against a real (test) database instead
// of only through the route handler.

import type { getScopedPrisma } from '@/lib/db';

export const LAST_OWNER_ERROR = 'Não é possível remover a última conta de dona da loja.';

export async function wouldRemoveLastOwner(
  db: ReturnType<typeof getScopedPrisma>,
  organizationId: string,
  targetUserId: string
): Promise<boolean> {
  const remainingOwners = await db.user.count({
    where: { organizationId, role: 'OWNER', id: { not: targetUserId } },
  });
  return remainingOwners === 0;
}
