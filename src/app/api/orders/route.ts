import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const dateFilter = searchParams.get('date');

    const whereClause: any = {};
    if (statusFilter && statusFilter !== 'ALL') {
      whereClause.status = statusFilter;
    }
    if (dateFilter) {
      const targetDate = new Date(dateFilter);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      whereClause.deliveryDate = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const orders = await db.order.findMany({
      where: whereClause,
      include: {
        items: true,
        payments: true,
        customer: true,
      },
      orderBy: { deliveryDate: 'asc' },
    });

    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar pedidos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const body = await request.json();
    const { customerName, customerWhatsapp, deliveryDate, status, totalAmount, notes, items } = body;

    if (!customerName || !customerWhatsapp || !deliveryDate || !totalAmount) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }

    const cleanPhone = customerWhatsapp.replace(/\D/g, '');
    let customer = await db.customer.findFirst({ where: { whatsapp: cleanPhone } });
    if (!customer) {
      customer = await db.customer.create({
        data: { name: customerName, whatsapp: cleanPhone, organizationId: session.organizationId },
      });
    }

    const year = new Date().getFullYear();
    const prefix = `PED-${year}-`;
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

    let orderNumber = `${prefix}${nextSeq.toString().padStart(4, '0')}`;
    while (
      await db.order.findUnique({
        where: { organizationId_orderNumber: { organizationId: session.organizationId, orderNumber } },
      })
    ) {
      nextSeq++;
      orderNumber = `${prefix}${nextSeq.toString().padStart(4, '0')}`;
    }

    const parsedTotal = parseFloat(totalAmount);
    const order = await db.order.create({
      data: {
        organizationId: session.organizationId,
        orderNumber,
        customerId: customer.id,
        customerName,
        customerWhatsapp: cleanPhone,
        deliveryDate: new Date(deliveryDate),
        status: status || 'NOVO',
        totalAmount: parsedTotal,
        paidAmount: 0.0,
        paymentStatus: 'PENDENTE',
        notes: notes || null,
        items: {
          create: Array.isArray(items)
            ? items.map((i: any) => ({
                productName: i.productName,
                variationName: i.variationName || null,
                cakeBase: i.cakeBase || null,
                filling1: i.filling1 || null,
                quantity: parseInt(i.quantity) || 1,
                unitPrice: parseFloat(i.unitPrice),
                totalPrice: parseFloat(i.totalPrice || i.unitPrice * i.quantity),
              }))
            : [],
        },
      },
      include: {
        items: true,
        payments: true,
      },
    });

    await db.customer.update({
      where: { id: customer.id },
      data: {
        ordersCount: { increment: 1 },
        totalSpent: { increment: parsedTotal },
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Erro ao criar pedido' }, { status: 500 });
  }
}
