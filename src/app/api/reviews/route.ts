import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getCurrentOrganization } from '@/lib/tenant';

// Public: a customer submits a review for their own delivered order. Access
// control mirrors /api/track -- order number + the same WhatsApp used on the
// order, never a bare id -- so this can't be used to post a review "as"
// someone else's order. The review is created inactive; it only reaches the
// public storefront after the confeiteira approves it in
// /admin/depoimentos, the same moderation gate manually-entered testimonials
// already go through.
export async function POST(request: Request) {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json({ error: 'Loja não encontrada.' }, { status: 404 });
    }
    const db = getScopedPrisma(organization.id);

    const body = await request.json();
    const { orderNumber, whatsapp, rating, comment } = body;

    const cleanNumber = String(orderNumber || '').trim().toUpperCase();
    const cleanWhatsapp = String(whatsapp || '').replace(/\D/g, '');

    if (!cleanNumber || !cleanWhatsapp) {
      return NextResponse.json(
        { error: 'Informe o número do pedido e o WhatsApp usado na encomenda.' },
        { status: 400 }
      );
    }

    const parsedRating = parseInt(rating, 10);
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return NextResponse.json({ error: 'Selecione uma nota de 1 a 5.' }, { status: 400 });
    }

    const cleanComment = String(comment || '').trim();
    if (!cleanComment) {
      return NextResponse.json({ error: 'Escreva um comentário sobre sua experiência.' }, { status: 400 });
    }

    const order = await db.order.findFirst({
      where: { orderNumber: cleanNumber, customerWhatsapp: cleanWhatsapp, status: 'ENTREGUE' },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Não encontramos um pedido entregue com esse número e WhatsApp.' },
        { status: 404 }
      );
    }

    await db.testimonial.create({
      data: {
        organizationId: organization.id,
        name: order.customerName,
        eventType: 'Cliente',
        comment: cleanComment,
        rating: parsedRating,
        active: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json({ error: 'Erro ao enviar avaliação.' }, { status: 500 });
  }
}
