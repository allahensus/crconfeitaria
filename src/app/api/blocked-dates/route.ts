import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getCurrentOrganization } from '@/lib/tenant';
import { getSession } from '@/lib/auth';

// Public: the storefront's date picker needs this list to warn customers
// before they submit a quote for a day that's already full.
export async function GET() {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json({ error: 'Loja não encontrada.' }, { status: 404 });
    }
    const db = getScopedPrisma(organization.id);

    const blockedDates = await db.blockedDate.findMany({
      orderBy: { date: 'asc' },
    });
    return NextResponse.json(blockedDates);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar datas bloqueadas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const { date, reason } = await request.json();
    if (!date) {
      return NextResponse.json({ error: 'Data é obrigatória' }, { status: 400 });
    }

    const blockedDate = await db.blockedDate.upsert({
      where: { organizationId_date: { organizationId: session.organizationId, date: new Date(date) } },
      update: { reason: reason || null },
      create: {
        date: new Date(date),
        reason: reason || null,
        organizationId: session.organizationId,
      },
    });

    return NextResponse.json(blockedDate, { status: 201 });
  } catch (error) {
    console.error('Error creating blocked date:', error);
    return NextResponse.json({ error: 'Erro ao bloquear data' }, { status: 500 });
  }
}
