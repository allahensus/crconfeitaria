import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

// Only manually-registered expenses (type DESPESA, backed by an Expense row)
// can be edited/deleted here. RECEITA transactions mirror real order payments
// and must stay in sync with their Order -- editing them here would desync
// the two, so they're intentionally not editable from this route.

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
    const { description, category, amount, paymentMethod, date, notes } = body;

    const transaction = await db.financialTransaction.findUnique({ where: { id } });
    if (!transaction) {
      return NextResponse.json({ error: 'Lançamento não encontrado' }, { status: 404 });
    }
    if (transaction.type !== 'DESPESA' || !transaction.expenseId) {
      return NextResponse.json(
        { error: 'Este lançamento é gerado automaticamente por um pedido e não pode ser editado aqui.' },
        { status: 400 }
      );
    }

    if (!description || !amount || !category) {
      return NextResponse.json({ error: 'Descrição, valor e categoria são obrigatórios' }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    const parsedDate = date ? new Date(date) : transaction.date;

    await db.expense.update({
      where: { id: transaction.expenseId },
      data: {
        description,
        category,
        amount: parsedAmount,
        paymentMethod: paymentMethod || undefined,
        date: parsedDate,
        notes: notes !== undefined ? notes : undefined,
      },
    });

    const updated = await db.financialTransaction.update({
      where: { id },
      data: { description, category, amount: parsedAmount, date: parsedDate },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating financial record:', error);
    return NextResponse.json({ error: 'Erro ao atualizar lançamento' }, { status: 500 });
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

    const transaction = await db.financialTransaction.findUnique({ where: { id } });
    if (!transaction) {
      return NextResponse.json({ error: 'Lançamento não encontrado' }, { status: 404 });
    }
    if (transaction.type !== 'DESPESA' || !transaction.expenseId) {
      return NextResponse.json(
        { error: 'Este lançamento é gerado automaticamente por um pedido e não pode ser excluído aqui.' },
        { status: 400 }
      );
    }

    await db.financialTransaction.delete({ where: { id } });
    await db.expense.delete({ where: { id: transaction.expenseId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting financial record:', error);
    return NextResponse.json({ error: 'Erro ao excluir lançamento' }, { status: 500 });
  }
}
