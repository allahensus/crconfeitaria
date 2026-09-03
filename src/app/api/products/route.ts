import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getCurrentOrganization } from '@/lib/tenant';
import { getSession } from '@/lib/auth';
import { slugify } from '@/lib/utils';

export async function GET(request: Request) {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json({ error: 'Loja não encontrada.' }, { status: 404 });
    }
    const db = getScopedPrisma(organization.id);

    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get('category');
    const featuredOnly = searchParams.get('featured') === 'true';
    const activeOnly = searchParams.get('active') !== 'false';

    const whereClause: any = {};
    if (activeOnly) whereClause.active = true;
    if (featuredOnly) whereClause.featured = true;
    if (categorySlug) {
      whereClause.category = { slug: categorySlug };
    }

    const products = await db.product.findMany({
      where: whereClause,
      include: {
        category: true,
        variations: {
          where: { active: true },
          orderBy: { price: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 });
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
    const { name, categoryId, description, mainImage, imageFit, imageZoom, imagePosX, imagePosY, basePrice, unit, yieldInfo, featured, active, variations } = body;

    if (!name || !categoryId || !description || basePrice === undefined) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    const category = await db.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 400 });
    }

    let slug = slugify(name);
    const existingSlug = await db.product.findUnique({
      where: { organizationId_slug: { organizationId: session.organizationId, slug } },
    });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const product = await db.product.create({
      data: {
        organizationId: session.organizationId,
        name,
        slug,
        categoryId,
        description,
        mainImage: mainImage || '/cinthia/WhatsApp Image 2026-08-20 at 17.59.33.jpeg',
        imageFit: imageFit === 'cover' ? 'cover' : 'contain',
        imageZoom: imageZoom !== undefined ? parseFloat(imageZoom) : 1,
        imagePosX: imagePosX !== undefined ? parseFloat(imagePosX) : 50,
        imagePosY: imagePosY !== undefined ? parseFloat(imagePosY) : 50,
        basePrice: parseFloat(basePrice),
        unit: unit || 'unidade',
        yieldInfo: yieldInfo || null,
        featured: Boolean(featured),
        active: active !== undefined ? Boolean(active) : true,
        variations: {
          create: Array.isArray(variations)
            ? variations.map((v: any) => ({
                name: v.name,
                price: parseFloat(v.price),
                slices: v.slices || null,
                weight: v.weight || null,
                active: v.active !== undefined ? Boolean(v.active) : true,
              }))
            : [],
        },
      },
      include: {
        category: true,
        variations: true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Erro ao criar produto' }, { status: 500 });
  }
}
