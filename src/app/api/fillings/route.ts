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
        organizationId: session.organizationId,
      }
    });

    return NextResponse.json(filling, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar recheio' }, { status: 500 });
  }
}
