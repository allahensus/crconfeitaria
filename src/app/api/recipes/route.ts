import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

// RecipeItem has no organizationId of its own — it's scoped transitively
// through its Product and Ingredient, both of which ARE tenant-scoped
// models. Every read/write here validates ownership of those two foreign
// keys explicitly instead of relying on getScopedPrisma's auto-where.

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    if (!productId) {
      return NextResponse.json({ error: 'productId é obrigatório' }, { status: 400 });
    }

    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    const recipeItems = await db.recipeItem.findMany({
      where: { productId },
      include: { ingredient: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(recipeItems);
  } catch (error) {
    console.error('Error fetching recipe:', error);
    return NextResponse.json({ error: 'Erro ao buscar ficha técnica' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const body = await request.json();
    const { productId, ingredientId, quantityUsed } = body;

    if (!productId || !ingredientId || !quantityUsed) {
      return NextResponse.json({ error: 'Produto, insumo e quantidade são obrigatórios' }, { status: 400 });
    }

    const [product, ingredient] = await Promise.all([
      db.product.findUnique({ where: { id: productId } }),
      db.ingredient.findUnique({ where: { id: ingredientId } }),
    ]);
    if (!product) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    if (!ingredient) return NextResponse.json({ error: 'Insumo não encontrado' }, { status: 404 });

    const recipeItem = await db.recipeItem.create({
      data: {
        productId,
        ingredientId,
        quantityUsed: parseFloat(quantityUsed),
      },
      include: { ingredient: true },
    });

    return NextResponse.json(recipeItem, { status: 201 });
  } catch (error) {
    console.error('Error creating recipe item:', error);
    return NextResponse.json({ error: 'Erro ao adicionar ingrediente na receita' }, { status: 500 });
  }
}
