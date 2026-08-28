import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getCurrentOrganization } from '@/lib/tenant';
import { getSession } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json({ error: 'Loja não encontrada.' }, { status: 404 });
    }
    const db = getScopedPrisma(organization.id);

    const { id } = await params;
    const product = await db.product.findUnique({
      where: { id },
      include: {
        category: true,
        variations: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar produto' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const db = getScopedPrisma(session.organizationId);

    const { id } = await params;
    const body = await request.json();

    const { name, categoryId, description, mainImage, imageFit, imageZoom, imagePosX, imagePosY, basePrice, unit, yieldInfo, featured, active, variations } = body;

    if (Array.isArray(variations)) {
      await db.productVariation.deleteMany({
        where: { productId: id },
      });
    }

    const updatedProduct = await db.product.update({
      where: { id },
      data: {
        name,
        categoryId,
        description,
        mainImage,
        imageFit: imageFit === 'cover' ? 'cover' : 'contain',
        imageZoom: imageZoom !== undefined ? parseFloat(imageZoom) : 1,
        imagePosX: imagePosX !== undefined ? parseFloat(imagePosX) : 50,
        imagePosY: imagePosY !== undefined ? parseFloat(imagePosY) : 50,
        basePrice: parseFloat(basePrice),
        unit,
        yieldInfo,
        featured: Boolean(featured),
        active: Boolean(active),
        variations: Array.isArray(variations)
          ? {
              create: variations.map((v: any) => ({
                name: v.name,
                price: parseFloat(v.price),
                slices: v.slices || null,
                weight: v.weight || null,
                active: v.active !== undefined ? Boolean(v.active) : true,
              })),
            }
          : undefined,
      },
      include: {
        category: true,
        variations: true,
      },
    });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Erro ao atualizar produto' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const db = getScopedPrisma(session.organizationId);

    const { id } = await params;
    await db.product.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir produto' }, { status: 500 });
  }
}
