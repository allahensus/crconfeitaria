import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { slugify } from '@/lib/utils';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const { id } = await params;
    const { name, description, order } = await request.json();
    if (!name) {
      return NextResponse.json({ error: 'Nome da categoria é obrigatório' }, { status: 400 });
    }

    const current = await db.category.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
    }

    let slug = current.slug;
    if (name !== current.name) {
      slug = slugify(name);
      const existingSlug = await db.category.findUnique({
        where: { organizationId_slug: { organizationId: session.organizationId, slug } },
      });
      if (existingSlug && existingSlug.id !== id) {
        slug = `${slug}-${Date.now().toString().slice(-4)}`;
      }
    }

    const category = await db.category.update({
      where: { id },
      data: {
        name,
        slug,
        description: description || null,
        order: order !== undefined ? parseInt(order) : undefined,
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar categoria' }, { status: 500 });
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

    const category = await db.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!category) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
    }
    if (category._count.products > 0) {
      return NextResponse.json(
        {
          error: `Não é possível excluir: existem ${category._count.products} produto(s) nesta categoria. Mova ou exclua os produtos primeiro.`,
        },
        { status: 400 }
      );
    }

    await db.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir categoria' }, { status: 500 });
  }
}
