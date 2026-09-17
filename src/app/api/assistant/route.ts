// src/app/api/assistant/route.ts
import { NextResponse } from 'next/server';
import { google } from '@ai-sdk/google';
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

// Rate limiting for this route is handled centrally by src/middleware.ts
// (it reads RATE_LIMITED_ROUTES and rejects with 429 before this handler
// ever runs) -- see the entry added to src/lib/rate-limit.ts in Step 1.
export async function POST(req: Request) {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return NextResponse.json({ error: 'Loja não encontrada.' }, { status: 404 });
  }

  let messages: UIMessage[];
  try {
    const body = await req.json();
    if (!Array.isArray(body.messages)) {
      return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
    }
    messages = body.messages;
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

    const tools = createAssistantTools(db, { whatsappNumber, minLeadDays });

    const result = streamText({
      // gemini-3.8-flash's free tier is capped at 5 requests/minute in
      // practice (confirmed via production AI_APICallError logs) -- far too
      // low for even light real traffic. gemini-2.5-flash-lite is an
      // established (non-preview) model with a much more usable free quota.
      model: google('gemini-2.5-flash-lite'),
      instructions: buildAssistantInstructions(bakeryName, depositPercentage),
      messages: await convertToModelMessages(recentMessages),
      stopWhen: isStepCount(3),
      maxOutputTokens: 1000,
      tools,
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
