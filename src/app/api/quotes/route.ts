import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getCurrentOrganization } from '@/lib/tenant';
import { getSession } from '@/lib/auth';
import { generateWhatsAppLink } from '@/lib/utils';

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
      cakeBase,
      filling1,
      frosting,
      extras,
      quantity,
      unitPrice,
      eventDate,
      themeNotes,
      subtotal,
      extraTotal,
      finalTotal,
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

    const parsedBirthDate = customerBirthDate ? new Date(customerBirthDate) : null;

    let customer = await db.customer.findFirst({
      where: { whatsapp: cleanWhatsapp },
    });

    if (!customer) {
      customer = await db.customer.create({
        data: {
          organizationId: organization.id,
          name: customerName,
          whatsapp: cleanWhatsapp,
          email: customerEmail || null,
          birthDate: parsedBirthDate && !isNaN(parsedBirthDate.getTime()) ? parsedBirthDate : null,
          lgpdAccepted: lgpdAccepted !== undefined ? Boolean(lgpdAccepted) : true,
        },
      });
    } else {
      await db.customer.update({
        where: { id: customer.id },
        data: {
          name: customerName,
          email: customerEmail || customer.email,
          birthDate: parsedBirthDate && !isNaN(parsedBirthDate.getTime()) ? parsedBirthDate : customer.birthDate,
          lgpdAccepted: lgpdAccepted !== undefined ? Boolean(lgpdAccepted) : customer.lgpdAccepted,
        },
      });
    }

    const year = new Date().getFullYear();
    const prefix = `ORC-${year}-`;
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

    let quoteNumber = `${prefix}${nextSeq.toString().padStart(4, '0')}`;
    while (
      await db.quote.findUnique({
        where: { organizationId_quoteNumber: { organizationId: organization.id, quoteNumber } },
      })
    ) {
      nextSeq++;
      quoteNumber = `${prefix}${nextSeq.toString().padStart(4, '0')}`;
    }

    const parseEventDate = eventDate ? new Date(eventDate) : null;
    const isValidEventDate = parseEventDate && !isNaN(parseEventDate.getTime());
    const qty = parseInt(quantity) || 1;
    const price = parseFloat(unitPrice) || 0;
    const tot = parseFloat(finalTotal) || price * qty;

    const quote = await db.quote.create({
      data: {
        organizationId: organization.id,
        quoteNumber,
        customerId: customer.id,
        customerName,
        customerWhatsapp: cleanWhatsapp,
        eventDate: isValidEventDate ? parseEventDate : null,
        themeNotes: themeNotes || null,
        subtotal: parseFloat(subtotal) || price * qty,
        extraTotal: parseFloat(extraTotal) || 0,
        discount: 0,
        finalTotal: tot,
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
    });

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
      cakeBase,
      filling1,
      frosting,
      extras,
      quantity: qty,
      eventDate: formattedEventDate,
      themeNotes,
      finalTotal: tot,
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
