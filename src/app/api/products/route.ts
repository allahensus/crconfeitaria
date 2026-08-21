import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { slugify } from '@/lib/utils';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get('category');
    const featuredOnly = searchParams.get('featured') === 'true';
    const activeOnly = searchParams.get('active') !== 'false'; // default true for public

    const whereClause: any = {};
    if (activeOnly) whereClause.active = true;
    if (featuredOnly) whereClause.featured = true;
    if (categorySlug) {
      whereClause.category = { slug: categorySlug };
    }

    const products = await prisma.product.findMany({
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

    const body = await request.json();
    const { name, categoryId, description, mainImage, basePrice, unit, yieldInfo, featured, active, variations } = body;

    if (!name || !categoryId || !description || basePrice === undefined) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    let slug = slugify(name);
    const existingSlug = await prisma.product.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        categoryId,
        description,
        mainImage: mainImage || '/cinthia/WhatsApp Image 2026-08-20 at 17.59.33.jpeg',
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
