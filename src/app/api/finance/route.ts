import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getSession, isOwnerFresh } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);
    if (!(await isOwnerFresh(session, db))) return NextResponse.json({ error: 'Acesso restrito à dona da loja' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'month';

    const now = new Date();
    let startDate = new Date();

    if (range === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (range === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (range === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (range === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      startDate = new Date(0);
    }

    const transactions = await db.financialTransaction.findMany({
      where: {
        date: { gte: startDate }
      },
      orderBy: { date: 'desc' },
      include: {
        order: true,
        expense: true,
      }
    });

    const expenses = await db.expense.findMany({
      where: {
        date: { gte: startDate }
      },
      orderBy: { date: 'desc' }
    });

    const orders = await db.order.findMany({
      where: {
        createdAt: { gte: startDate }
      }
    });

    const totalRevenue = transactions
      .filter((t) => t.type === 'RECEITA')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter((t) => t.type === 'DESPESA')
      .reduce((sum, t) => sum + t.amount, 0);

    const netProfit = totalRevenue - totalExpenses;

    const activeOrders = await db.order.findMany({
      where: {
        status: { notIn: ['ENTREGUE', 'CANCELADO'] }
      }
    });

    const accountsReceivable = activeOrders.reduce(
      (sum, o) => sum + (o.totalAmount - o.paidAmount),
      0
    );

    const paidOrdersTotal = orders
      .filter(o => o.paymentStatus === 'PAGO')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const averageTicket = orders.length > 0
      ? orders.reduce((sum, o) => sum + o.totalAmount, 0) / orders.length
      : 0;

    return NextResponse.json({
      range,
      metrics: {
        totalRevenue,
        totalExpenses,
        netProfit,
        accountsReceivable,
        paidOrdersTotal,
        averageTicket,
        totalOrders: orders.length,
      },
      transactions,
      expenses,
    });
  } catch (error) {
    console.error('Error fetching finance:', error);
    return NextResponse.json({ error: 'Erro ao carregar dados financeiros' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);
    if (!(await isOwnerFresh(session, db))) return NextResponse.json({ error: 'Acesso restrito à dona da loja' }, { status: 403 });

    const body = await request.json();
    const { type, description, category, amount, paymentMethod, date, notes } = body;

    if (!description || !amount || !category) {
      return NextResponse.json({ error: 'Descrição, valor e categoria são obrigatórios' }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'O valor deve ser maior que zero.' }, { status: 400 });
    }
    const parsedDate = date ? new Date(date) : new Date();

    if (type === 'DESPESA') {
      const expense = await db.expense.create({
        data: {
          description,
          category,
          amount: parsedAmount,
          paymentMethod: paymentMethod || 'Pix',
          date: parsedDate,
          notes: notes || null,
          organizationId: session.organizationId,
        }
      });

      await db.financialTransaction.create({
        data: {
          type: 'DESPESA',
          amount: parsedAmount,
          category,
          description,
          date: parsedDate,
          expenseId: expense.id,
          organizationId: session.organizationId,
        }
      });

      return NextResponse.json(expense, { status: 201 });
    } else {
      const transaction = await db.financialTransaction.create({
        data: {
          type: 'RECEITA',
          amount: parsedAmount,
          category,
          description,
          date: parsedDate,
          organizationId: session.organizationId,
        }
      });

      return NextResponse.json(transaction, { status: 201 });
    }
  } catch (error) {
    console.error('Error creating financial record:', error);
    return NextResponse.json({ error: 'Erro ao registrar lançamento financeiro' }, { status: 500 });
  }
}
