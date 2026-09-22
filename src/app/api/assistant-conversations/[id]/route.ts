import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const { id } = await params;

    // findUnique on AssistantConversation is auto-scoped by organizationId
    // (see TENANT_SCOPED_MODELS in src/lib/db.ts) -- a conversation id from
    // another organization simply returns null here, never another
    // tenant's data.
    const conversation = await db.assistantConversation.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
    }

    return NextResponse.json(conversation);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar conversa' }, { status: 500 });
  }
}
