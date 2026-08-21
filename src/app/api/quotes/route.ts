import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { generateWhatsAppLink } from '@/lib/utils';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const quotes = await prisma.quote.findMany({
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
      filling2,
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

    if (!customerName || !customerWhatsapp || !productName) {
      return NextResponse.json(
        { error: 'Nome, WhatsApp e Produto são obrigatórios.' },
        { status: 400 }
      );
    }

    // 1. Find or create Customer with birthDate & LGPD consent
    const cleanWhatsapp = customerWhatsapp.replace(/\D/g, '');
    const parsedBirthDate = customerBirthDate ? new Date(customerBirthDate) : null;

    let customer = await prisma.customer.findFirst({
      where: { whatsapp: cleanWhatsapp },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: customerName,
          whatsapp: cleanWhatsapp,
          email: customerEmail || null,
          birthDate: parsedBirthDate && !isNaN(parsedBirthDate.getTime()) ? parsedBirthDate : null,
          lgpdAccepted: lgpdAccepted !== undefined ? Boolean(lgpdAccepted) : true,
        },
      });
    } else {
      // Update customer info if provided
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          name: customerName,
          email: customerEmail || customer.email,
          birthDate: parsedBirthDate && !isNaN(parsedBirthDate.getTime()) ? parsedBirthDate : customer.birthDate,
          lgpdAccepted: lgpdAccepted !== undefined ? Boolean(lgpdAccepted) : customer.lgpdAccepted,
        },
      });
    }

    // 2. Generate Quote Number (ORC-YYYY-XXXX)
    const count = await prisma.quote.count();
    const year = new Date().getFullYear();
    const quoteNumber = `ORC-${year}-${(count + 1).toString().padStart(4, '0')}`;

    // 3. Create Quote with Items
    const parseEventDate = eventDate ? new Date(eventDate) : null;
    const qty = parseInt(quantity) || 1;
    const price = parseFloat(unitPrice) || 0;
    const tot = parseFloat(finalTotal) || price * qty;

    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        customerId: customer.id,
        customerName,
        customerWhatsapp: cleanWhatsapp,
        eventDate: parseEventDate && !isNaN(parseEventDate.getTime()) ? parseEventDate : null,
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
              filling2: filling2 || null,
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

    // 4. Fetch bakery WhatsApp number from settings
    const waSetting = await prisma.setting.findUnique({
      where: { key: 'whatsapp_number' },
    });
    const bakeryWhatsapp = waSetting?.value || '5511999999999';

    // 5. Generate WhatsApp URL
    const whatsappUrl = generateWhatsAppLink(bakeryWhatsapp, {
      quoteNumber: quote.quoteNumber,
      customerName,
      productName,
      variation,
      cakeBase,
      filling1,
      filling2,
      frosting,
      extras,
      quantity: qty,
      eventDate: eventDate ? new Date(eventDate).toLocaleDateString('pt-BR') : undefined,
      themeNotes,
      finalTotal: tot,
    });

    return NextResponse.json({
      success: true,
      quote,
      whatsappUrl,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating quote:', error);
    return NextResponse.json({ error: 'Erro ao gerar orçamento.' }, { status: 500 });
  }
}
