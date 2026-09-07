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

    // Tenant/existence check up front, via the scoped client, before opening
    // a transaction at all -- a bad or cross-tenant id should 404 fast.
    const orderExists = await db.order.findUnique({ where: { id }, select: { id: true } });
    if (!orderExists) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });

    let stockWarning: string | null = null;

    const updatedOrder = await db.$transaction(async (tx) => {
      // Row lock: blocks a second concurrent PUT on this same order until this
      // transaction commits, so the read right after is guaranteed fresh --
      // not a snapshot taken before either request's transaction began. Without
      // this, two simultaneous status changes to EM_PRODUCAO both see
      // stockDeducted=false and both deduct, and two simultaneous addPayment
      // calls both compute paidAmount from the same stale base and one
      // overwrites the other's payment.
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE`;

      const current = await tx.order.findUnique({
        where: { id },
        include: { payments: true, items: true },
      });
      if (!current) throw new Error('ORDER_NOT_FOUND');

      let paidAmount = current.paidAmount;
      let paymentStatus = current.paymentStatus;
      let stockDeducted = current.stockDeducted;

      if (status === 'EM_PRODUCAO' && current.status !== 'EM_PRODUCAO' && !current.stockDeducted) {
        const result = await deductStockForOrder(tx, current);
        stockDeducted = true;
        if (result.skippedItems.length > 0) {
          stockWarning = `Baixa de estoque incompleta: ${result.skippedItems.length} ite${result.skippedItems.length > 1 ? 'ns' : 'm'} do pedido ${current.orderNumber} não têm produto vinculado ou ficha técnica cadastrada, então nenhum insumo foi descontado para ele(s).`;
          console.warn(`[stock] Incomplete deduction for order ${current.orderNumber}:`, result.skippedItems);
        }
      } else if (status === 'CANCELADO' && current.stockDeducted) {
        await restoreStockForOrder(tx, current);
        stockDeducted = false;
      }

      if (addPayment) {
        const paymentAmount = parseFloat(addPayment.amount);
        const paymentMethod = addPayment.paymentMethod || 'Pix';
        const notes = addPayment.notes || null;

        await tx.payment.create({
          data: {
            orderId: id,
            amount: paymentAmount,
            paymentMethod,
            notes,
            status: 'CONFIRMADO',
          },
        });

        await tx.financialTransaction.create({
          data: {
            organizationId: session.organizationId,
            type: 'RECEITA',
            amount: paymentAmount,
            category: 'Venda de Pedido',
            description: `Pagamento ${paymentMethod} do pedido ${current.orderNumber}`,
            orderId: id,
          },
        });

        // Recompute from the authoritative sum of confirmed payments, taken
        // under the same lock, instead of incrementing an in-memory value --
        // that's what makes two concurrent payments both land instead of one
        // clobbering the other.
        const paymentSum = await tx.payment.aggregate({
          where: { orderId: id, status: 'CONFIRMADO' },
          _sum: { amount: true },
        });
        paidAmount = paymentSum._sum.amount ?? 0;
        if (paidAmount >= current.totalAmount) {
          paymentStatus = 'PAGO';
        } else if (paidAmount > 0) {
          paymentStatus = 'PARCIAL';
        }
      }

      return tx.order.update({
        where: { id },
        data: {
          status: status || current.status,
          paidAmount,
          paymentStatus,
          stockDeducted,
          deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : current.deliveryDate,
          notes: body.notes !== undefined ? body.notes : current.notes,
        },
        include: {
          items: true,
          payments: true,
          customer: true,
        },
      });
    });

    return NextResponse.json(stockWarning ? { ...updatedOrder, stockWarning } : updatedOrder);
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
