// src/app/api/assistant/route.ts
import { NextResponse } from 'next/server';
import { groq } from '@ai-sdk/groq';
import {
  streamText,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
  isStepCount,
  UIMessage,
} from 'ai';
import { getScopedPrisma } from '@/lib/db';
import { getCurrentOrganization } from '@/lib/tenant';
import { createAssistantTools, buildAssistantInstructions } from '@/lib/assistant-tools';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function extractText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('\n');
}

// Rate limiting for this route is handled centrally by src/middleware.ts
// (it reads RATE_LIMITED_ROUTES and rejects with 429 before this handler
// ever runs) -- see the entry added to src/lib/rate-limit.ts in Step 1.
export async function POST(req: Request) {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return NextResponse.json({ error: 'Loja não encontrada.' }, { status: 404 });
  }

  let messages: UIMessage[];
  let conversationId: string | undefined;
  try {
    const body = await req.json();
    if (!Array.isArray(body.messages)) {
      return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
    }
    messages = body.messages;
    conversationId = typeof body.conversationId === 'string' ? body.conversationId : undefined;
  } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  }

  try {
    // Cap history sent to the model -- DefaultChatTransport resends the
    // full conversation every turn, so an unbounded history makes each
    // request arbitrarily expensive.
    const recentMessages = messages.slice(-20);

    const db = getScopedPrisma(organization.id);
    const settingsRows = await db.setting.findMany();
    const settingsMap = Object.fromEntries(settingsRows.map((s) => [s.key, s.value]));

    const bakeryName = settingsMap.bakery_name || 'Cinthia Rodrigues';
    const whatsappNumber = settingsMap.whatsapp_number || '5512997594697';
    const minLeadDays = settingsMap.min_lead_days ? parseInt(settingsMap.min_lead_days) : 3;
    const depositPercentage = settingsMap.deposit_percentage ? parseInt(settingsMap.deposit_percentage) : 50;

    const tools = createAssistantTools(db, { whatsappNumber, minLeadDays, organizationId: organization.id });

    // Best-effort conversation logging -- never let a logging failure break
    // the actual chat response. conversationId is client-generated and
    // trusted as-is (same accepted-risk posture as the message history
    // itself, see ADR 0004): worst case is a mixed-up log row, never a
    // cross-tenant read, since every query below stays scoped by
    // organization.id via getScopedPrisma.
    if (conversationId) {
      try {
        await db.assistantConversation.upsert({
          where: { id: conversationId },
          update: { lastMessageAt: new Date() },
          create: { id: conversationId, organizationId: organization.id },
        });

        const lastMessage = recentMessages[recentMessages.length - 1];
        if (lastMessage?.role === 'user') {
          await db.assistantMessage.create({
            data: {
              conversationId,
              role: 'user',
              text: extractText(lastMessage),
            },
          });
        }
      } catch (logError) {
        console.error('Failed to log assistant conversation (user turn):', logError);
      }
    }

    // `const` (unlike the `let conversationId` above) so the closure below
    // keeps the narrowed `string` type instead of widening back to
    // `string | undefined`.
    const conversationIdForLogging = conversationId;

    const result = streamText({
      // Testing Groq as an alternative to Gemini: Gemini's free tier has
      // repeatedly caused issues in production (rate limits, a model
      // deprecation, and a 30s stream timeout with no error surfaced) --
      // Groq's LPU hardware is much faster, which should avoid the timeout
      // class of failure, and its free tier's daily quota is generous
      // enough for this site's real traffic. gpt-oss-120b is Groq's
      // current flagship for tool-calling quality.
      model: groq('openai/gpt-oss-120b'),
      instructions: buildAssistantInstructions(bakeryName, depositPercentage, minLeadDays),
      messages: await convertToModelMessages(recentMessages),
      stopWhen: isStepCount(3),
      maxOutputTokens: 1000,
      tools,
      onEnd: conversationIdForLogging
        ? async (end) => {
            try {
              const tokens = end.totalUsage?.totalTokens ?? null;
              await db.assistantMessage.create({
                data: {
                  conversationId: conversationIdForLogging,
                  role: 'assistant',
                  text: end.text || '',
                  toolCalls: end.toolCalls?.length ? JSON.stringify(end.toolCalls) : null,
                  tokens,
                },
              });
              await db.assistantConversation.update({
                where: { id: conversationIdForLogging },
                data: {
                  lastMessageAt: new Date(),
                  totalTokens: { increment: tokens ?? 0 },
                },
              });
            } catch (logError) {
              console.error('Failed to log assistant conversation (assistant turn):', logError);
            }
          }
        : undefined,
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
        onError: () => 'Não consegui responder agora. Tente de novo em alguns instantes ou fale direto no WhatsApp.',
      }),
    });
  } catch {
    return NextResponse.json({ error: 'Erro ao processar a mensagem.' }, { status: 500 });
  }
}
