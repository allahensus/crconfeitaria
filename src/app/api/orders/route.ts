import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

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

    const orders = await prisma.order.findMany({
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

    const body = await request.json();
    const { customerName, customerWhatsapp, deliveryDate, status, totalAmount, notes, items } = body;

    if (!customerName || !customerWhatsapp || !deliveryDate || !totalAmount) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }

    // 1. Find or create customer
    const cleanPhone = customerWhatsapp.replace(/\D/g, '');
    let customer = await prisma.customer.findFirst({ where: { whatsapp: cleanPhone } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: { name: customerName, whatsapp: cleanPhone },
      });
    }

    // 2. Generate Order Number
    const count = await prisma.order.count();
    const year = new Date().getFullYear();
    const orderNumber = `PED-${year}-${(count + 1).toString().padStart(4, '0')}`;

    const parsedTotal = parseFloat(totalAmount);
    const order = await prisma.order.create({
      data: {
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
                filling2: i.filling2 || null,
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

    // Update customer stats
    await prisma.customer.update({
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
