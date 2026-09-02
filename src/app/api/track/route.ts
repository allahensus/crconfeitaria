import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getCurrentOrganization } from '@/lib/tenant';

const ORDER_STATUS_LABELS: Record<string, string> = {
  NOVO: 'Recebido',
  AGUARDANDO_CONFIRMACAO: 'Aguardando Confirmação',
  CONFIRMADO: 'Confirmado',
  PAGAMENTO_PENDENTE: 'Aguardando Pagamento',
  EM_PRODUCAO: 'Em Produção',
  PRONTO: 'Pronto para Entrega',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

const QUOTE_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Orçamento Recebido',
  APPROVED: 'Orçamento Aprovado',
  CONVERTED: 'Convertido em Pedido',
  REJECTED: 'Recusado',
};

// Public: a customer looks up their own order/quote by number + the same
// WhatsApp they gave when ordering -- that pairing is the access control,
// so this never returns another customer's data.
export async function GET(request: Request) {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json({ error: 'Loja não encontrada.' }, { status: 404 });
    }
    const db = getScopedPrisma(organization.id);

    const { searchParams } = new URL(request.url);
    const numero = (searchParams.get('numero') || '').trim().toUpperCase();
    const whatsapp = (searchParams.get('whatsapp') || '').replace(/\D/g, '');

    if (!numero || !whatsapp || whatsapp.length < 10) {
      return NextResponse.json(
        { error: 'Informe o número do pedido e o WhatsApp usado na encomenda.' },
        { status: 400 }
      );
    }

    const order = await db.order.findFirst({
      where: { orderNumber: numero, customerWhatsapp: whatsapp },
      include: { items: true, payments: true },
    });

    if (order) {
      return NextResponse.json({
        type: 'order',
        number: order.orderNumber,
        status: order.status,
        statusLabel: ORDER_STATUS_LABELS[order.status] || order.status,
        deliveryDate: order.deliveryDate,
        totalAmount: order.totalAmount,
        paidAmount: order.paidAmount,
        paymentStatus: order.paymentStatus,
        items: order.items.map((i) => ({ productName: i.productName, variationName: i.variationName, quantity: i.quantity })),
        createdAt: order.createdAt,
      });
    }

    const quote = await db.quote.findFirst({
      where: { quoteNumber: numero, customerWhatsapp: whatsapp },
      include: { items: true },
    });

    if (quote) {
      return NextResponse.json({
        type: 'quote',
        number: quote.quoteNumber,
        status: quote.status,
        statusLabel: QUOTE_STATUS_LABELS[quote.status] || quote.status,
        deliveryDate: quote.eventDate,
        totalAmount: quote.finalTotal,
        paidAmount: 0,
        paymentStatus: 'PENDENTE',
        items: quote.items.map((i) => ({ productName: i.productName, variationName: i.variation, quantity: i.quantity })),
        createdAt: quote.createdAt,
      });
    }

    return NextResponse.json(
      { error: 'Não encontramos nenhum pedido ou orçamento com esse número e WhatsApp.' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error tracking order:', error);
    return NextResponse.json({ error: 'Erro ao consultar pedido.' }, { status: 500 });
  }
}
