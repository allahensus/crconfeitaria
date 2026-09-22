import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getCurrentOrganization } from '@/lib/tenant';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json({ error: 'Loja não encontrada.' }, { status: 404 });
    }
    const db = getScopedPrisma(organization.id);

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') !== 'all';

    const galleryItems = await db.galleryItem.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });
    return NextResponse.json(galleryItems);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar galeria' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const body = await request.json();
    const { imageUrl, caption, eventType, order, active, imageZoom, imagePosX, imagePosY } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: 'A foto é obrigatória' }, { status: 400 });
    }

    const galleryItem = await db.galleryItem.create({
      data: {
        organizationId: session.organizationId,
        imageUrl,
        caption: caption || null,
        eventType: eventType || 'Geral',
        order: order !== undefined ? parseInt(order) : 0,
        active: active !== undefined ? Boolean(active) : true,
        imageZoom: imageZoom !== undefined ? parseFloat(imageZoom) : 1,
        imagePosX: imagePosX !== undefined ? parseFloat(imagePosX) : 50,
        imagePosY: imagePosY !== undefined ? parseFloat(imagePosY) : 50,
      },
    });

    return NextResponse.json(galleryItem, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao adicionar foto na galeria' }, { status: 500 });
  }
}
