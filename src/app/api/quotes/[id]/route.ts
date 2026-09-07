import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { withNumberRetry } from '@/lib/sequence';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const { id } = await params;
    const quote = await db.quote.findUnique({
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
    const db = getScopedPrisma(session.organizationId);

    const { id } = await params;
    const body = await request.json();
    const { status, convertToOrder } = body;

    const quote = await db.quote.findUnique({
      where: { id },
      include: { items: true, customer: true },
    });

    if (!quote) return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 });

    if (convertToOrder) {
      const year = new Date().getFullYear();
      const prefix = `PED-${year}-`;

      const generateOrderNumberCandidate = async () => {
        const lastOrder = await db.order.findFirst({
          where: { orderNumber: { startsWith: prefix } },
          orderBy: { orderNumber: 'desc' },
        });
        let nextSeq = 1;
        if (lastOrder?.orderNumber) {
          const parts = lastOrder.orderNumber.split('-');
          const lastSeq = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(lastSeq)) {
            nextSeq = lastSeq + 1;
          }
        }
        return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
      };

      const deliveryDate = quote.eventDate || new Date(Date.now() + 86400000 * 3);

      const orgProductIds = new Set(
        (await db.product.findMany({ select: { id: true } })).map((p) => p.id)
      );

      const newOrder = await withNumberRetry(
        generateOrderNumberCandidate,
        (orderNumber) =>
          db.order.create({
            data: {
              organizationId: session.organizationId,
              orderNumber,
              quoteId: quote.id,
              customerId: quote.customerId,
              customerName: quote.customerName,
              customerWhatsapp: quote.customerWhatsapp,
              preferredPaymentMethod: quote.preferredPaymentMethod,
              depositAmount: quote.depositAmount,
              deliveryDate,
              status: 'NOVO',
              totalAmount: quote.finalTotal,
              paidAmount: 0.0,
              paymentStatus: 'PENDENTE',
              notes: quote.themeNotes,
              items: {
                create: quote.items.map((item) => ({
                  productId: item.productId && item.productId !== 'custom' && orgProductIds.has(item.productId) ? item.productId : null,
                  productName: item.productName,
                  variationName: item.variation,
                  cakeBase: item.cakeBase,
                  filling1: item.filling1,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  totalPrice: item.totalPrice,
                })),
              },
            },
          }),
        5,
        'orderNumber'
      );

      if (quote.customerId) {
        await db.customer.update({
          where: { id: quote.customerId },
          data: {
            ordersCount: { increment: 1 },
            totalSpent: { increment: quote.finalTotal },
          },
        });
      }

      const updatedQuote = await db.quote.update({
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

    const updatedQuote = await db.quote.update({
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
    const db = getScopedPrisma(session.organizationId);

    const { id } = await params;
    await db.quote.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir orçamento' }, { status: 500 });
  }
}
