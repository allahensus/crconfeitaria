import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getCurrentOrganization } from '@/lib/tenant';

// Public: same access model as /api/track -- the pairing of order id +
// the WhatsApp given at order time is the access control. Never confirms
// whether an id exists to a caller with the wrong WhatsApp; both "wrong
// number" and "no such order" return the same 404.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json({ error: 'Loja não encontrada.' }, { status: 404 });
    }
    const db = getScopedPrisma(organization.id);

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const whatsapp = (searchParams.get('whatsapp') || '').replace(/\D/g, '');

    if (!whatsapp || whatsapp.length < 10) {
      return NextResponse.json({ error: 'Informe o WhatsApp usado na encomenda.' }, { status: 400 });
    }

    const order = await db.order.findFirst({
      where: { id, customerWhatsapp: whatsapp },
      include: { items: true, payments: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Não encontramos esse pedido com esse WhatsApp.' }, { status: 404 });
    }

    return NextResponse.json({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      deliveryDate: order.deliveryDate,
      totalAmount: order.totalAmount,
      paidAmount: order.paidAmount,
      paymentStatus: order.paymentStatus,
      items: order.items.map((i) => ({
        productName: i.productName,
        variationName: i.variationName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
      })),
      payments: order.payments.map((p) => ({
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        paidAt: p.paidAt,
      })),
      createdAt: order.createdAt,
    });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    return NextResponse.json({ error: 'Erro ao buscar recibo.' }, { status: 500 });
  }
}
