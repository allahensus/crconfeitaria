import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getScopedPrisma } from '@/lib/db';
import { getSession, isOwner } from '@/lib/auth';

// NOTE: User is not in TENANT_SCOPED_MODELS (src/lib/db.ts) — getScopedPrisma
// does not auto-scope it. Every query below adds organizationId manually.

const VALID_ROLES = new Set(['OWNER', 'STAFF']);
const LAST_OWNER_ERROR = 'Não é possível remover a última conta de dona da loja.';

async function wouldRemoveLastOwner(
  db: ReturnType<typeof getScopedPrisma>,
  organizationId: string,
  targetUserId: string
): Promise<boolean> {
  const remainingOwners = await db.user.count({
    where: { organizationId, role: 'OWNER', id: { not: targetUserId } },
  });
  return remainingOwners === 0;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!isOwner(session)) return NextResponse.json({ error: 'Acesso restrito à dona da loja' }, { status: 403 });
    const db = getScopedPrisma(session.organizationId);

    const { id } = await params;
    const existing = await db.user.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const { name, email, password, role } = await request.json();

    if (role !== undefined && !VALID_ROLES.has(role)) {
      return NextResponse.json({ error: 'Papel inválido' }, { status: 400 });
    }
    if (existing.role === 'OWNER' && role && role !== 'OWNER') {
      if (await wouldRemoveLastOwner(db, session.organizationId, id)) {
        return NextResponse.json({ error: LAST_OWNER_ERROR }, { status: 400 });
      }
    }

    const user = await db.user.update({
      where: { id },
      data: {
        name: name || undefined,
        email: email || undefined,
        role: role || undefined,
        password: password ? await bcrypt.hash(password, 10) : undefined,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return NextResponse.json(user);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Já existe uma conta com esse e-mail.' }, { status: 400 });
    }
    console.error('Error updating team member:', error);
    return NextResponse.json({ error: 'Erro ao atualizar conta da equipe' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!isOwner(session)) return NextResponse.json({ error: 'Acesso restrito à dona da loja' }, { status: 403 });
    const db = getScopedPrisma(session.organizationId);

    const { id } = await params;
    const existing = await db.user.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    if (existing.role === 'OWNER' && (await wouldRemoveLastOwner(db, session.organizationId, id))) {
      return NextResponse.json({ error: LAST_OWNER_ERROR }, { status: 400 });
    }

    await db.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting team member:', error);
    return NextResponse.json({ error: 'Erro ao excluir conta da equipe' }, { status: 500 });
  }
}
