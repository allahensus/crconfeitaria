import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getSession, isOwnerFresh } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);
    if (!(await isOwnerFresh(session, db))) return NextResponse.json({ error: 'Acesso restrito à dona da loja' }, { status: 403 });

    const { id } = await params;
    const { code, discountType, discountValue, active, expiresAt, maxUses, oncePerCustomer } = await request.json();

    const coupon = await db.coupon.update({
      where: { id },
      data: {
        ...(code && { code: code.trim().toUpperCase().replace(/\s+/g, '') }),
        ...(discountType && { discountType: discountType === 'FIXED' ? 'FIXED' : 'PERCENT' }),
        ...(discountValue !== undefined && { discountValue: parseFloat(discountValue) }),
        ...(active !== undefined && { active: Boolean(active) }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(maxUses !== undefined && { maxUses: maxUses !== null && maxUses !== '' ? parseInt(maxUses) : null }),
        ...(oncePerCustomer !== undefined && { oncePerCustomer: Boolean(oncePerCustomer) }),
      },
    });

    return NextResponse.json(coupon);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Já existe um cupom com esse código.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao atualizar cupom' }, { status: 500 });
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
    if (!(await isOwnerFresh(session, db))) return NextResponse.json({ error: 'Acesso restrito à dona da loja' }, { status: 403 });

    const { id } = await params;
    await db.coupon.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir cupom' }, { status: 500 });
  }
}
