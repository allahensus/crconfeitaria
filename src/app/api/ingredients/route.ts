import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const ingredients = await prisma.ingredient.findMany({
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

    const body = await request.json();
    const { name, unit, packageQuantity, costPrice, category } = body;

    if (!name || !packageQuantity || costPrice === undefined) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    const ingredient = await prisma.ingredient.create({
      data: {
        name,
        unit: unit || 'g',
        packageQuantity: parseFloat(packageQuantity),
        costPrice: parseFloat(costPrice),
        category: category || 'Ingredientes',
      },
    });

    return NextResponse.json(ingredient, { status: 201 });
  } catch (error) {
    console.error('Error creating ingredient:', error);
    return NextResponse.json({ error: 'Erro ao cadastrar insumo' }, { status: 500 });
  }
}
