import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const coupons = await db.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(coupons);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar cupons' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const { code, discountType, discountValue, active, expiresAt, maxUses, oncePerCustomer } = await request.json();

    if (!code || !discountValue) {
      return NextResponse.json({ error: 'Código e valor do desconto são obrigatórios' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '');

    const coupon = await db.coupon.create({
      data: {
        code: cleanCode,
        discountType: discountType === 'FIXED' ? 'FIXED' : 'PERCENT',
        discountValue: parseFloat(discountValue),
        active: active !== undefined ? Boolean(active) : true,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxUses: maxUses !== null && maxUses !== undefined && maxUses !== '' ? parseInt(maxUses) : null,
        oncePerCustomer: oncePerCustomer !== undefined ? Boolean(oncePerCustomer) : true,
        organizationId: session.organizationId,
      },
    });

    return NextResponse.json(coupon, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Já existe um cupom com esse código.' }, { status: 400 });
    }
    console.error('Error creating coupon:', error);
    return NextResponse.json({ error: 'Erro ao criar cupom' }, { status: 500 });
  }
}
