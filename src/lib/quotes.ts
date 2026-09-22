import type { Prisma } from '@prisma/client';
import type { ScopedPrismaClient } from './db';
import { generateWhatsAppLink } from './utils';
import { checkCouponEligibility } from './coupons';
import { withNumberRetry } from './sequence';

export class QuoteValidationError extends Error {}

export interface CreateQuoteInput {
  customerName: string;
  customerWhatsapp: string;
  customerEmail?: string;
  customerBirthDate?: string;
  lgpdAccepted?: boolean;
  productId?: string;
  productName: string;
  variation?: string;
  isBiscoito?: boolean;
  cakeBase?: string;
  filling1?: string;
  frosting?: string;
  extras?: string;
  quantity: number | string;
  unitPrice: number | string;
  eventDate: string; // YYYY-MM-DD or full ISO
  preferredPaymentMethod?: string;
  themeNotes?: string;
  subtotal?: number | string;
  extraTotal?: number | string;
  finalTotal: number | string;
  couponCode?: string;
  createdByAssistant?: boolean;
}

// ReturnType on a generic Prisma delegate method resolves against the
// method's default type parameters, not the `include: { items: true }`
// this function actually passes -- it would type `quote` without `items`
// even though the real value always has it. Prisma.QuoteGetPayload names
// the exact shape the `include` below produces.
type QuoteWithItems = Prisma.QuoteGetPayload<{ include: { items: true } }>;

export interface CreateQuoteResult {
  quote: QuoteWithItems;
  whatsappUrl: string;
}

export async function createQuote(
  db: ScopedPrismaClient,
  organizationId: string,
  input: CreateQuoteInput
): Promise<CreateQuoteResult> {
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
    createdByAssistant,
  } = input;

  const trimmedName = (customerName || '').trim();
  const cleanWhatsapp = (customerWhatsapp || '').replace(/\D/g, '');

  if (!trimmedName) {
    throw new QuoteValidationError('Por favor, informe seu Nome Completo.');
  }

  if (!cleanWhatsapp || cleanWhatsapp.length < 10) {
    throw new QuoteValidationError('Por favor, informe um número de WhatsApp válido com DDD (ex: 11999998888).');
  }

  if (!productName) {
    throw new QuoteValidationError('Por favor, selecione um produto para o orçamento.');
  }

  const parsedEventDateCheck = eventDate ? new Date(eventDate) : null;
  if (!parsedEventDateCheck || isNaN(parsedEventDateCheck.getTime())) {
    throw new QuoteValidationError('Por favor, escolha a data desejada da entrega/festa.');
  }

  const eventDateStr = eventDate.slice(0, 10);
  const isBlockedDate = await db.blockedDate.findFirst({
    where: { date: new Date(`${eventDateStr}T00:00:00.000Z`) },
  });
  if (isBlockedDate) {
    throw new QuoteValidationError('Essa data já está com a agenda cheia. Por favor, escolha outra data.');
  }

  const parsedBirthDate = customerBirthDate ? new Date(customerBirthDate) : null;

  const customer = await db.customer.upsert({
    where: { organizationId_whatsapp: { organizationId, whatsapp: cleanWhatsapp } },
    create: {
      organizationId,
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
  const isValidEventDate = parseEventDate !== null && !isNaN(parseEventDate.getTime());
  const qty = parseInt(String(quantity)) || 1;
  const price = parseFloat(String(unitPrice)) || 0;
  const tot = parseFloat(String(finalTotal)) || price * qty;
  const sub = parseFloat(String(subtotal)) || price * qty;

  if (!Number.isFinite(qty) || qty < 1 || !Number.isFinite(price) || price < 0 || !Number.isFinite(tot) || tot < 0 || !Number.isFinite(sub) || sub < 0) {
    throw new QuoteValidationError('Valores de preço ou quantidade inválidos.');
  }

  let appliedDiscount = 0;
  let appliedCouponCode: string | null = null;
  if (couponCode) {
    const cleanCode = String(couponCode).trim().toUpperCase().replace(/\s+/g, '');
    const coupon = await db.coupon.findUnique({
      where: { organizationId_code: { organizationId, code: cleanCode } },
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
      const claimed = await db.coupon.updateMany({
        where: {
          id: coupon!.id,
          ...(coupon!.maxUses !== null ? { usageCount: { lt: coupon!.maxUses } } : {}),
        },
        data: { usageCount: { increment: 1 } },
      });
      if (claimed.count > 0) {
        appliedCouponCode = coupon!.code;
        appliedDiscount = coupon!.discountType === 'PERCENT'
          ? Math.round(sub * (coupon!.discountValue / 100) * 100) / 100
          : Math.min(coupon!.discountValue, sub);
      }
    }
  }

  const depositSetting = await db.setting.findUnique({
    where: { organizationId_key: { organizationId, key: 'deposit_percentage' } },
  });
  const depositPercent = parseFloat(depositSetting?.value || '50') || 50;
  const depositAmount = Math.round(tot * (depositPercent / 100) * 100) / 100;

  const quote = await withNumberRetry(generateQuoteNumberCandidate, (quoteNumber) =>
    db.quote.create({
      data: {
        organizationId,
        quoteNumber,
        customerId: customer.id,
        customerName,
        customerWhatsapp: cleanWhatsapp,
        eventDate: isValidEventDate ? parseEventDate : null,
        preferredPaymentMethod: preferredPaymentMethod || null,
        themeNotes: themeNotes || null,
        subtotal: sub,
        extraTotal: parseFloat(String(extraTotal)) || 0,
        discount: appliedDiscount,
        couponCode: appliedCouponCode,
        finalTotal: tot,
        depositAmount,
        status: 'PENDING',
        createdByAssistant: Boolean(createdByAssistant),
        items: {
          create: [
            {
              productId: input.productId || 'custom',
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
    where: { organizationId_key: { organizationId, key: 'whatsapp_number' } },
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

  return { quote, whatsappUrl };
}
