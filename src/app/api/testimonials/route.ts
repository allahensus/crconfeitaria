import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const testimonials = await prisma.testimonial.findMany({
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

    const body = await request.json();
    const { name, eventType, comment, rating, active } = body;

    const testimonial = await prisma.testimonial.create({
      data: {
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
