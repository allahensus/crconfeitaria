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

    const testimonials = await db.testimonial.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(testimonials);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar depoimentos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const body = await request.json();
    const { name, eventType, comment, rating, active } = body;

    const testimonial = await db.testimonial.create({
      data: {
        organizationId: session.organizationId,
        name,
        eventType: eventType || 'Cliente',
        comment,
        rating: rating ? parseInt(rating) : 5,
        active: active !== undefined ? Boolean(active) : true,
      },
    });

    return NextResponse.json(testimonial, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar depoimento' }, { status: 500 });
  }
}
