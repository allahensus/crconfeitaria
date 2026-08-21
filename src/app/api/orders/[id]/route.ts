import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
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

    const { id } = await params;
    const body = await request.json();
    const { status, addPayment } = body;

    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!existingOrder) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });

    let updatedPaidAmount = existingOrder.paidAmount;
    let paymentStatus = existingOrder.paymentStatus;

    // Handle Payment Registration
    if (addPayment) {
      const paymentAmount = parseFloat(addPayment.amount);
      const paymentMethod = addPayment.paymentMethod || 'Pix';
      const notes = addPayment.notes || null;

      await prisma.payment.create({
        data: {
          orderId: id,
          amount: paymentAmount,
          paymentMethod,
          notes,
          status: 'CONFIRMADO',
        },
      });

      // Register financial transaction automatically
      await prisma.financialTransaction.create({
        data: {
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

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: status || existingOrder.status,
        paidAmount: updatedPaidAmount,
        paymentStatus,
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

    const { id } = await params;
    await prisma.order.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir pedido' }, { status: 500 });
  }
}
