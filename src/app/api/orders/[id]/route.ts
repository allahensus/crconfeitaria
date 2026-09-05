import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { deductStockForOrder, restoreStockForOrder } from '@/lib/stock';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const { id } = await params;
    const order = await db.order.findUnique({
      where: { id },
      include: {
        items: true,
        payments: true,
        customer: true,
        quote: true,
      },
    });

    if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar pedido' }, { status: 500 });
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
    const { status, addPayment } = body;

    const existingOrder = await db.order.findUnique({
      where: { id },
      include: { payments: true, items: true },
    });

    if (!existingOrder) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });

    let updatedPaidAmount = existingOrder.paidAmount;
    let paymentStatus = existingOrder.paymentStatus;
    let stockDeducted = existingOrder.stockDeducted;

    if (status === 'EM_PRODUCAO' && existingOrder.status !== 'EM_PRODUCAO' && !existingOrder.stockDeducted) {
      await deductStockForOrder(db, existingOrder);
      stockDeducted = true;
    } else if (status === 'CANCELADO' && existingOrder.stockDeducted) {
      await restoreStockForOrder(db, existingOrder);
      stockDeducted = false;
    }

    if (addPayment) {
      const paymentAmount = parseFloat(addPayment.amount);
      const paymentMethod = addPayment.paymentMethod || 'Pix';
      const notes = addPayment.notes || null;

      await db.payment.create({
        data: {
          orderId: id,
          amount: paymentAmount,
          paymentMethod,
          notes,
          status: 'CONFIRMADO',
        },
      });

      await db.financialTransaction.create({
        data: {
          organizationId: session.organizationId,
          type: 'RECEITA',
          amount: paymentAmount,
          category: 'Venda de Pedido',
          description: `Pagamento ${paymentMethod} do pedido ${existingOrder.orderNumber}`,
          orderId: id,
        },
      });

      updatedPaidAmount += paymentAmount;
      if (updatedPaidAmount >= existingOrder.totalAmount) {
        paymentStatus = 'PAGO';
      } else if (updatedPaidAmount > 0) {
        paymentStatus = 'PARCIAL';
      }
    }

    const updatedOrder = await db.order.update({
      where: { id },
      data: {
        status: status || existingOrder.status,
        paidAmount: updatedPaidAmount,
        paymentStatus,
        stockDeducted,
        deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : existingOrder.deliveryDate,
        notes: body.notes !== undefined ? body.notes : existingOrder.notes,
      },
      include: {
        items: true,
        payments: true,
        customer: true,
      },
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Erro ao atualizar pedido' }, { status: 500 });
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
    await db.order.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir pedido' }, { status: 500 });
  }
}
