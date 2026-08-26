import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const customers = await db.customer.findMany({
      include: {
        _count: {
          select: { orders: true, quotes: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(customers);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar clientes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const body = await request.json();
    const { name, whatsapp, email, cpf, address, notes } = body;

    if (!name || !whatsapp) {
      return NextResponse.json({ error: 'Nome e WhatsApp são obrigatórios' }, { status: 400 });
    }

    const cleanPhone = whatsapp.replace(/\D/g, '');
    const customer = await db.customer.create({
      data: {
        name,
        whatsapp: cleanPhone,
        email: email || null,
        cpf: cpf || null,
        address: address || null,
        notes: notes || null,
        organizationId: session.organizationId,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao cadastrar cliente' }, { status: 500 });
  }
}
