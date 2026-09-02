import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getCurrentOrganization } from '@/lib/tenant';

// Public: the storefront calls this to check a coupon before applying its
// discount. Only ever returns the fields a customer needs -- never usageCount
// or other internal bookkeeping.
export async function POST(request: Request) {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json({ error: 'Loja não encontrada.' }, { status: 404 });
    }
    const db = getScopedPrisma(organization.id);

    const { code } = await request.json();
    if (!code) {
      return NextResponse.json({ valid: false, error: 'Informe um código de cupom.' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '');
    const coupon = await db.coupon.findUnique({
      where: { organizationId_code: { organizationId: organization.id, code: cleanCode } },
    });

    if (!coupon || !coupon.active) {
      return NextResponse.json({ valid: false, error: 'Cupom inválido ou não encontrado.' }, { status: 404 });
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return NextResponse.json({ valid: false, error: 'Esse cupom já expirou.' }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    return NextResponse.json({ valid: false, error: 'Erro ao validar cupom.' }, { status: 500 });
  }
}
