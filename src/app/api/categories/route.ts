import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getCurrentOrganization } from '@/lib/tenant';
import { getSession } from '@/lib/auth';
import { slugify } from '@/lib/utils';

export async function GET() {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json({ error: 'Loja não encontrada.' }, { status: 404 });
    }
    const db = getScopedPrisma(organization.id);

    const categories = await db.category.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });
    return NextResponse.json(categories);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar categorias' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const db = getScopedPrisma(session.organizationId);

    const { name, description, order } = await request.json();
    if (!name) {
      return NextResponse.json({ error: 'Nome da categoria é obrigatório' }, { status: 400 });
    }

    let slug = slugify(name);
    const category = await db.category.create({
      data: {
        name,
        slug,
        description: description || null,
        order: order !== undefined ? parseInt(order) : 0,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar categoria' }, { status: 500 });
  }
}
