import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: { items: true, customer: true, order: true },
    });

    if (!quote) return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 });
    return NextResponse.json(quote);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar orçamento' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { status, convertToOrder } = body;

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: { items: true, customer: true },
    });

    if (!quote) return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 });

    // Handle Conversion to Order
    if (convertToOrder) {
      const orderCount = await prisma.order.count();
      const year = new Date().getFullYear();
      const orderNumber = `PED-${year}-${(orderCount + 1).toString().padStart(4, '0')}`;

      const deliveryDate = quote.eventDate || new Date(Date.now() + 86400000 * 3);

      const newOrder = await prisma.order.create({
        data: {
          orderNumber,
          quoteId: quote.id,
          customerId: quote.customerId,
          customerName: quote.customerName,
          customerWhatsapp: quote.customerWhatsapp,
          deliveryDate,
          status: 'NOVO',
          totalAmount: quote.finalTotal,
          paidAmount: 0.0,
          paymentStatus: 'PENDENTE',
          notes: quote.themeNotes,
          items: {
            create: quote.items.map((item) => ({
              productName: item.productName,
              variationName: item.variation,
              cakeBase: item.cakeBase,
              filling1: item.filling1,
              filling2: item.filling2,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            })),
          },
        },
      });

      // Update customer metrics
      if (quote.customerId) {
        await prisma.customer.update({
          where: { id: quote.customerId },
          data: {
            ordersCount: { increment: 1 },
            totalSpent: { increment: quote.finalTotal },
          },
        });
      }

      // Mark quote as CONVERTED
      const updatedQuote = await prisma.quote.update({
        where: { id },
        data: { status: 'CONVERTED' },
        include: { items: true, order: true },
      });

      return NextResponse.json({
        success: true,
        message: 'Orçamento convertido em pedido com sucesso!',
        order: newOrder,
        quote: updatedQuote,
      });
    }

    const updatedQuote = await prisma.quote.update({
      where: { id },
      data: { status: status || quote.status },
      include: { items: true },
    });

    return NextResponse.json(updatedQuote);
  } catch (error) {
    console.error('Error updating quote:', error);
    return NextResponse.json({ error: 'Erro ao atualizar orçamento' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = await params;
    await prisma.quote.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir orçamento' }, { status: 500 });
  }
}
