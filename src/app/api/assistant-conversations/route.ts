import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

// Admin-only: lists the AI assistant's logged conversations, most recent
// first, with a message count and a preview of the first thing the visitor
// asked. Full transcripts are fetched one at a time via [id]/route.ts.
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const conversations = await db.assistantConversation.findMany({
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
      include: {
        messages: {
          where: { role: 'user' },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
        _count: { select: { messages: true } },
      },
    });

    return NextResponse.json(
      conversations.map((c) => ({
        id: c.id,
        startedAt: c.startedAt,
        lastMessageAt: c.lastMessageAt,
        totalTokens: c.totalTokens,
        messageCount: c._count.messages,
        firstQuestion: c.messages[0]?.text ?? null,
      }))
    );
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar conversas' }, { status: 500 });
  }
}
