import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getCurrentOrganization } from '@/lib/tenant';
import { getSession } from '@/lib/auth';
import { generateWhatsAppLink } from '@/lib/utils';
import { checkCouponEligibility } from '@/lib/coupons';
import { withNumberRetry } from '@/lib/sequence';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const db = getScopedPrisma(session.organizationId);

    const quotes = await db.quote.findMany({
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
    const {
      customerName,
      customerWhatsapp,
      customerEmail,
      customerBirthDate,
      lgpdAccepted,
      productName,
      variation,
      isBiscoito,
      cakeBase,
      filling1,
      frosting,
      extras,
      quantity,
      unitPrice,
      eventDate,
      preferredPaymentMethod,
      themeNotes,
      subtotal,
      extraTotal,
      finalTotal,
      couponCode,
    } = body;

    const trimmedName = (customerName || '').trim();
    const cleanWhatsapp = (customerWhatsapp || '').replace(/\D/g, '');

    if (!trimmedName) {
      return NextResponse.json(
        { error: 'Por favor, informe seu Nome Completo.' },
        { status: 400 }
      );
    }

    if (!cleanWhatsapp || cleanWhatsapp.length < 10) {
      return NextResponse.json(
        { error: 'Por favor, informe um número de WhatsApp válido com DDD (ex: 11999998888).' },
        { status: 400 }
      );
    }

    if (!productName) {
      return NextResponse.json(
        { error: 'Por favor, selecione um produto para o orçamento.' },
        { status: 400 }
      );
    }

    const parsedEventDateCheck = eventDate ? new Date(eventDate) : null;
    if (!parsedEventDateCheck || isNaN(parsedEventDateCheck.getTime())) {
      return NextResponse.json(
        { error: 'Por favor, escolha a data desejada da entrega/festa.' },
        { status: 400 }
      );
    }

    const eventDateStr = eventDate.slice(0, 10);
    const isBlockedDate = await db.blockedDate.findFirst({
      where: { date: new Date(`${eventDateStr}T00:00:00.000Z`) },
    });
    if (isBlockedDate) {
      return NextResponse.json(
        { error: 'Essa data já está com a agenda cheia. Por favor, escolha outra data.' },
        { status: 400 }
      );
    }

    if (!preferredPaymentMethod) {
      return NextResponse.json(
        { error: 'Por favor, escolha a forma de pagamento preferida.' },
        { status: 400 }
      );
    }

    const parsedBirthDate = customerBirthDate ? new Date(customerBirthDate) : null;

    // upsert (not find-then-create) so two near-simultaneous submissions from
    // the same new customer can't both miss the "already exists" check and
    // both insert -- the database resolves the race via the
    // (organizationId, whatsapp) unique constraint, not application logic.
    // upsert is deliberately outside getScopedPrisma's auto-scoping (its
    // where must reference a real unique constraint), so it's built by hand.
    const customer = await db.customer.upsert({
      where: { organizationId_whatsapp: { organizationId: organization.id, whatsapp: cleanWhatsapp } },
      create: {
        organizationId: organization.id,
        name: customerName,
        whatsapp: cleanWhatsapp,
        email: customerEmail || null,
        birthDate: parsedBirthDate && !isNaN(parsedBirthDate.getTime()) ? parsedBirthDate : null,
        lgpdAccepted: lgpdAccepted !== undefined ? Boolean(lgpdAccepted) : true,
      },
      update: {
        name: customerName,
        email: customerEmail || undefined,
        birthDate: parsedBirthDate && !isNaN(parsedBirthDate.getTime()) ? parsedBirthDate : undefined,
        lgpdAccepted: lgpdAccepted !== undefined ? Boolean(lgpdAccepted) : undefined,
      },
    });

    const year = new Date().getFullYear();
    const prefix = `ORC-${year}-`;

    const generateQuoteNumberCandidate = async () => {
      const lastQuote = await db.quote.findFirst({
        where: { quoteNumber: { startsWith: prefix } },
        orderBy: { quoteNumber: 'desc' },
      });
      let nextSeq = 1;
      if (lastQuote?.quoteNumber) {
        const parts = lastQuote.quoteNumber.split('-');
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) {
          nextSeq = lastSeq + 1;
        }
      }
      return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
    };

    const parseEventDate = eventDate ? new Date(eventDate) : null;
    const isValidEventDate = parseEventDate && !isNaN(parseEventDate.getTime());
    const qty = parseInt(quantity) || 1;
    const price = parseFloat(unitPrice) || 0;
    const tot = parseFloat(finalTotal) || price * qty;
    const sub = parseFloat(subtotal) || price * qty;

    if (!Number.isFinite(qty) || qty < 1 || !Number.isFinite(price) || price < 0 || !Number.isFinite(tot) || tot < 0 || !Number.isFinite(sub) || sub < 0) {
      return NextResponse.json({ error: 'Valores de preço ou quantidade inválidos.' }, { status: 400 });
    }

    // Re-validate the coupon server-side before trusting the client-computed
    // discount -- don't just take the client's word for it being applied.
    let appliedDiscount = 0;
    let appliedCouponCode: string | null = null;
    if (couponCode) {
      const cleanCode = String(couponCode).trim().toUpperCase().replace(/\s+/g, '');
      const coupon = await db.coupon.findUnique({
        where: { organizationId_code: { organizationId: organization.id, code: cleanCode } },
      });
      let alreadyUsedByCustomer = false;
      if (coupon?.oncePerCustomer) {
        const priorUse = await db.quote.findFirst({
          where: { couponCode: coupon.code, customerWhatsapp: cleanWhatsapp },
        });
        alreadyUsedByCustomer = !!priorUse;
      }
      const eligibility = checkCouponEligibility(coupon, alreadyUsedByCustomer);
      if (eligibility.ok) {
        // Atomic claim: the WHERE and the increment run as one statement in
        // Postgres, so concurrent submissions racing the same near-exhausted
        // coupon can't all read "still eligible" and all apply the discount --
        // only as many as maxUses actually allows get count > 0 back.
        const claimed = await db.coupon.updateMany({
          where: {
            id: coupon!.id,
            ...(coupon!.maxUses !== null ? { usageCount: { lt: coupon!.maxUses } } : {}),
          },
          data: { usageCount: { increment: 1 } },
        });
        if (claimed.count > 0) {
          appliedCouponCode = coupon!.code;
          // Computed from the coupon's own stored value against the
          // server-validated subtotal -- the client's `discount` field is
          // never trusted, or a customer could claim any coupon and submit
          // an arbitrary discount amount alongside it.
          appliedDiscount = coupon!.discountType === 'PERCENT'
            ? Math.round(sub * (coupon!.discountValue / 100) * 100) / 100
            : Math.min(coupon!.discountValue, sub);
        }
      }
    }

    const depositSetting = await db.setting.findUnique({
      where: { organizationId_key: { organizationId: organization.id, key: 'deposit_percentage' } },
    });
    const depositPercent = parseFloat(depositSetting?.value || '50') || 50;
    const depositAmount = Math.round(tot * (depositPercent / 100) * 100) / 100;

    const quote = await withNumberRetry(generateQuoteNumberCandidate, (quoteNumber) =>
      db.quote.create({
        data: {
          organizationId: organization.id,
          quoteNumber,
          customerId: customer.id,
          customerName,
          customerWhatsapp: cleanWhatsapp,
          eventDate: isValidEventDate ? parseEventDate : null,
          preferredPaymentMethod: preferredPaymentMethod || null,
          themeNotes: themeNotes || null,
          subtotal: parseFloat(subtotal) || price * qty,
          extraTotal: parseFloat(extraTotal) || 0,
          discount: appliedDiscount,
          couponCode: appliedCouponCode,
          finalTotal: tot,
          depositAmount,
          status: 'PENDING',
          items: {
            create: [
              {
                productId: body.productId || 'custom',
                productName,
                variation: variation || null,
                cakeBase: cakeBase || null,
                filling1: filling1 || null,
                frosting: frosting || null,
                extras: extras || null,
                quantity: qty,
                unitPrice: price,
                totalPrice: tot,
              },
            ],
          },
        },
        include: {
          items: true,
        },
      })
    );

    const waSetting = await db.setting.findUnique({
      where: { organizationId_key: { organizationId: organization.id, key: 'whatsapp_number' } },
    });
    const bakeryWhatsapp = waSetting?.value || '5512997594697';

    const formattedEventDate = isValidEventDate ? parseEventDate.toLocaleDateString('pt-BR') : undefined;
    const whatsappUrl = generateWhatsAppLink(bakeryWhatsapp, {
      quoteNumber: quote.quoteNumber,
      customerName,
      productName,
      variation,
      isBiscoito,
      cakeBase,
      filling1,
      frosting,
      extras,
      quantity: qty,
      eventDate: formattedEventDate,
      themeNotes,
      finalTotal: tot,
      depositAmount,
    });

    return NextResponse.json({
      success: true,
      quote,
      whatsappUrl,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating quote:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao gerar orçamento.' },
      { status: 500 }
    );
  }
}
