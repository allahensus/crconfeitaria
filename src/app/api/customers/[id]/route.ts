import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = await params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          include: { items: true, payments: true },
          orderBy: { createdAt: 'desc' },
        },
        quotes: {
          include: { items: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    return NextResponse.json(customer);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar cliente' }, { status: 500 });
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

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        name: body.name,
        whatsapp: body.whatsapp ? body.whatsapp.replace(/\D/g, '') : undefined,
        email: body.email,
        cpf: body.cpf,
        address: body.address,
        notes: body.notes,
      },
    });

    return NextResponse.json(updatedCustomer);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar cliente' }, { status: 500 });
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
    await prisma.customer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir cliente' }, { status: 500 });
  }
}
