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
    const { name, category, extraPrice, description, active } = await request.json();
    if (!name) {
      return NextResponse.json({ error: 'Nome do recheio é obrigatório' }, { status: 400 });
    }

    const current = await db.fillingOption.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: 'Recheio não encontrado' }, { status: 404 });
    }

    const filling = await db.fillingOption.update({
      where: { id },
      data: {
        name,
        category: category || 'Geral',
        extraPrice: extraPrice !== undefined && extraPrice !== '' ? parseFloat(extraPrice) : 0,
        description: description || null,
        active: active !== undefined ? Boolean(active) : current.active,
      },
    });

    return NextResponse.json(filling);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar recheio' }, { status: 500 });
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

    const current = await db.fillingOption.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: 'Recheio não encontrado' }, { status: 404 });
    }

    await db.fillingOption.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir recheio' }, { status: 500 });
  }
}
