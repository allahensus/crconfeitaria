import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getCurrentOrganization } from '@/lib/tenant';
import { getSession } from '@/lib/auth';
import { createQuote } from '@/lib/quotes';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const db = getScopedPrisma(session.organizationId);

    const { searchParams } = new URL(request.url);
    const createdByAssistantParam = searchParams.get('createdByAssistant');

    const quotes = await db.quote.findMany({
      where: createdByAssistantParam === 'true' ? { createdByAssistant: true } : undefined,
      include: {
        items: true,
        customer: true,
        order: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(quotes);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar orçamentos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json({ error: 'Loja não encontrada.' }, { status: 404 });
    }
    const db = getScopedPrisma(organization.id);
    const body = await request.json();

    const { quote, whatsappUrl } = await createQuote(db, organization.id, body);

    return NextResponse.json({ success: true, quote, whatsappUrl }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating quote:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao gerar orçamento.' },
      { status: error?.message ? 400 : 500 }
    );
  }
}
