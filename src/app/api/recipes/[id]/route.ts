import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const { id } = await params;
    const { quantityUsed } = await request.json();

    const existing = await db.recipeItem.findUnique({ where: { id }, include: { product: true } });
    if (!existing || existing.product.organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Item de receita não encontrado' }, { status: 404 });
    }

    const recipeItem = await db.recipeItem.update({
      where: { id },
      data: { quantityUsed: quantityUsed !== undefined ? parseFloat(quantityUsed) : undefined },
      include: { ingredient: true },
    });

    return NextResponse.json(recipeItem);
  } catch (error) {
    console.error('Error updating recipe item:', error);
    return NextResponse.json({ error: 'Erro ao atualizar item da receita' }, { status: 500 });
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

    const existing = await db.recipeItem.findUnique({ where: { id }, include: { product: true } });
    if (!existing || existing.product.organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Item de receita não encontrado' }, { status: 404 });
    }

    await db.recipeItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting recipe item:', error);
    return NextResponse.json({ error: 'Erro ao excluir item da receita' }, { status: 500 });
  }
}
