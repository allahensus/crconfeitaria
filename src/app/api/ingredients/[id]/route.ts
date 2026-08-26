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
