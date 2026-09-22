import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getCurrentOrganization } from '@/lib/tenant';
import { checkCouponEligibility } from '@/lib/coupons';

// Public: the storefront calls this to check a coupon before applying its
// discount. Only ever returns the fields a customer needs -- never
// usageCount or other internal bookkeeping.
export async function POST(request: Request) {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json({ error: 'Loja não encontrada.' }, { status: 404 });
    }
    const db = getScopedPrisma(organization.id);

    const { code, whatsapp } = await request.json();
    if (!code) {
      return NextResponse.json({ valid: false, error: 'Informe um código de cupom.' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '');
    const coupon = await db.coupon.findUnique({
      where: { organizationId_code: { organizationId: organization.id, code: cleanCode } },
    });

    let alreadyUsedByCustomer = false;
    if (coupon?.oncePerCustomer && whatsapp) {
      const cleanWhatsapp = String(whatsapp).replace(/\D/g, '');
      if (cleanWhatsapp) {
        const priorUse = await db.quote.findFirst({
          where: { couponCode: coupon.code, customerWhatsapp: cleanWhatsapp },
        });
        alreadyUsedByCustomer = !!priorUse;
      }
    }

    const eligibility = checkCouponEligibility(coupon, alreadyUsedByCustomer);
    if (!eligibility.ok) {
      return NextResponse.json({ valid: false, error: eligibility.error }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      code: coupon!.code,
      discountType: coupon!.discountType,
      discountValue: coupon!.discountValue,
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    return NextResponse.json({ valid: false, error: 'Erro ao validar cupom.' }, { status: 500 });
  }
}
