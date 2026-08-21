import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const fillings = await prisma.fillingOption.findMany({
      where: { active: true },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(fillings);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar recheios' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { name, category, extraPrice, description } = await request.json();
    if (!name) {
      return NextResponse.json({ error: 'Nome do recheio é obrigatório' }, { status: 400 });
    }

    const filling = await prisma.fillingOption.create({
      data: {
        name,
        category: category || 'Geral',
        extraPrice: extraPrice ? parseFloat(extraPrice) : 0,
        description: description || null,
      }
    });

    return NextResponse.json(filling, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar recheio' }, { status: 500 });
  }
}
