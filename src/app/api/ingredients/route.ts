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
    const { name, unit, packageQuantity, costPrice, category, stockQuantity, lowStockThreshold } = body;

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
        stockQuantity: stockQuantity !== undefined ? parseFloat(stockQuantity) : 0,
        lowStockThreshold: lowStockThreshold !== undefined ? parseFloat(lowStockThreshold) : 0,
        organizationId: session.organizationId,
      },
    });

    return NextResponse.json(ingredient, { status: 201 });
  } catch (error) {
    console.error('Error creating ingredient:', error);
    return NextResponse.json({ error: 'Erro ao cadastrar insumo' }, { status: 500 });
  }
}
