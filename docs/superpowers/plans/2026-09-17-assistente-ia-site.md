# Assistente de IA no Site Público — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a floating AI chat widget to the public homepage that answers questions about products, fillings and date availability using real catalog data, and hands off to WhatsApp with a ready-made summary — never writing to the database.

**Architecture:** A Next.js Route Handler (`/api/assistant`) streams `ai`'s `streamText` output using Google Gemini (free tier) with four read-only server-side tools that query the existing Prisma models. A client component (`AssistantChat`) renders the conversation with `useChat` and turns the `gerarResumoWhatsApp` tool's output into a WhatsApp button.

**Tech Stack:** `ai@7`, `@ai-sdk/google`, `@ai-sdk/react`, `zod` (all already installed via `npm install`, not yet committed), Next.js App Router, Prisma, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-17-assistente-ia-site-design.md`

## Global Constraints

- Provider: `@ai-sdk/google`, model id `'gemini-3.8-flash'` — never through the Vercel AI Gateway (explicit user decision: start on Gemini's free tier).
- Env var name (exact): `GOOGLE_GENERATIVE_AI_API_KEY`.
- Rate limit for `POST /api/assistant`: `{ windowMs: 10 * 60 * 1000, max: 15 }` (15 messages / 10 min per IP).
- Zero database writes anywhere in this feature — every tool is read-only.
- All assistant-facing copy (system instructions, UI strings) is in Portuguese.
- Work happens on the already-checked-out branch `feature/assistente-ia-site`. Do not merge to `main` until the user has validated the feature on its Vercel preview deployment URL (standing user preference — see Task 6).

---

## Task 1: Date availability pure function

**Files:**
- Create: `src/lib/availability.ts`
- Test: `tests/lib/availability.test.ts`

**Interfaces:**
- Produces: `checkDateAvailability(dateStr: string, blockedDates: string[], minLeadDays: number, now?: Date): { available: true } | { available: false; reason: 'too_soon' | 'blocked' }`. `dateStr` and every entry of `blockedDates` are `'YYYY-MM-DD'`. Mirrors the exact disable logic already in `src/components/public/AvailabilityDatePicker.tsx` (`isPast || isBlocked`, where `isPast` means "before today + minLeadDays").

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/availability.test.ts
import { describe, it, expect } from 'vitest';
import { checkDateAvailability } from '@/lib/availability';

describe('checkDateAvailability', () => {
  const fixedNow = new Date(2026, 8, 15); // Sept 15, 2026 (local time, no DST surprises)

  it('is available for a future date that is not blocked and past the lead time', () => {
    const result = checkDateAvailability('2026-10-01', [], 3, fixedNow);
    expect(result).toEqual({ available: true });
  });

  it('is too_soon for a date before today + minLeadDays', () => {
    const result = checkDateAvailability('2026-09-16', [], 3, fixedNow);
    expect(result).toEqual({ available: false, reason: 'too_soon' });
  });

  it('is available exactly at the minLeadDays boundary', () => {
    const result = checkDateAvailability('2026-09-18', [], 3, fixedNow);
    expect(result).toEqual({ available: true });
  });

  it('is blocked for a date past the lead time but marked as blocked', () => {
    const result = checkDateAvailability('2026-10-01', ['2026-10-01'], 3, fixedNow);
    expect(result).toEqual({ available: false, reason: 'blocked' });
  });

  it('reports too_soon (not blocked) when a date is both too soon and blocked', () => {
    const result = checkDateAvailability('2026-09-16', ['2026-09-16'], 3, fixedNow);
    expect(result).toEqual({ available: false, reason: 'too_soon' });
  });

  it('defaults now to the current time when not provided', () => {
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 1);
    const dateStr = farFuture.toISOString().slice(0, 10);
    const result = checkDateAvailability(dateStr, [], 3);
    expect(result).toEqual({ available: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/availability.test.ts`
Expected: FAIL with "Cannot find module '@/lib/availability'" (or similar resolution error).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/availability.ts

// Mirrors the disable logic in AvailabilityDatePicker.tsx exactly: a date is
// unavailable if it falls before "today + minLeadDays" (isPast there) or if
// it's in the confectioner's blockedDates list (isBlocked there). Kept as a
// pure function here so the AI assistant's tool and the date picker agree on
// the same rule without duplicating it.
export type AvailabilityResult =
  | { available: true }
  | { available: false; reason: 'too_soon' | 'blocked' };

export function checkDateAvailability(
  dateStr: string,
  blockedDates: string[],
  minLeadDays: number,
  now: Date = new Date()
): AvailabilityResult {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const earliestAllowed = new Date(today);
  earliestAllowed.setDate(earliestAllowed.getDate() + minLeadDays);

  const target = new Date(`${dateStr}T00:00:00`);

  if (target < earliestAllowed) {
    return { available: false, reason: 'too_soon' };
  }
  if (blockedDates.includes(dateStr)) {
    return { available: false, reason: 'blocked' };
  }
  return { available: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/availability.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/availability.ts tests/lib/availability.test.ts
git commit -m "feat: add pure date-availability check for the AI assistant"
```

---

## Task 2: Assistant tools (tool-calling against real catalog data)

**Files:**
- Create: `src/lib/assistant-tools.ts`
- Test: `tests/lib/assistant-tools.test.ts`

**Interfaces:**
- Consumes: `checkDateAvailability` from `./availability` (Task 1); `formatWhatsappForUrl` from `./utils` (existing); `getScopedPrisma` from `./db` (existing, for typing/tests only — the factory itself takes a already-scoped `db`).
- Produces:
  - `createAssistantTools(db: ScopedDb, config: AssistantToolsConfig): AssistantToolSet` — `AssistantToolsConfig = { whatsappNumber: string; minLeadDays: number }`. Returns an object with keys `listarBolosECategorias`, `listarRecheios`, `verificarDisponibilidade`, `gerarResumoWhatsApp`, each built with `tool()` from `ai`. Consumed by Task 3's route handler as the `tools` option of `streamText`.
  - `buildAssistantInstructions(bakeryName: string): string` — the system prompt text. Consumed by Task 3.

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/assistant-tools.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { resetTestDatabase } from '../helpers/testDb';
import { prisma } from '@/lib/prisma';
import { getScopedPrisma } from '@/lib/db';
import { createAssistantTools, buildAssistantInstructions } from '@/lib/assistant-tools';

describe('createAssistantTools', () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function makeOrgWithCatalog() {
    const org = await prisma.organization.create({
      data: { name: 'Loja Teste', subdomain: `loja-teste-${Math.random().toString(36).slice(2)}` },
    });
    const category = await prisma.category.create({
      data: { name: 'Bolos', slug: 'bolos', organizationId: org.id },
    });
    const product = await prisma.product.create({
      data: {
        name: 'Bolo de Chocolate',
        slug: 'bolo-de-chocolate',
        categoryId: category.id,
        description: 'Delicioso',
        mainImage: '/img.jpg',
        basePrice: 120,
        unit: 'unidade',
        yieldInfo: '20 fatias',
        organizationId: org.id,
        variations: {
          create: [{ name: '20 a 25 fatias', price: 150, slices: '20-25 fatias' }],
        },
      },
    });
    await prisma.fillingOption.create({
      data: { name: 'Ninho com Nutella', category: 'Gourmet', extraPrice: 15, organizationId: org.id },
    });
    await prisma.blockedDate.create({
      data: { date: new Date('2026-12-24T00:00:00Z'), reason: 'Véspera de Natal', organizationId: org.id },
    });
    return { org, category, product };
  }

  it('listarBolosECategorias returns active products with category and variations', async () => {
    const { org } = await makeOrgWithCatalog();
    const db = getScopedPrisma(org.id);
    const tools = createAssistantTools(db, { whatsappNumber: '5512997594697', minLeadDays: 3 });

    const result = await tools.listarBolosECategorias.execute!({}, { toolCallId: 'test', messages: [] } as any);

    expect(result).toEqual([
      {
        nome: 'Bolo de Chocolate',
        categoria: 'Bolos',
        precoBase: 120,
        unidade: 'unidade',
        rendimento: '20 fatias',
        variacoes: [{ nome: '20 a 25 fatias', preco: 150, fatias: '20-25 fatias', peso: null }],
      },
    ]);
  });

  it('listarRecheios returns active fillings', async () => {
    const { org } = await makeOrgWithCatalog();
    const db = getScopedPrisma(org.id);
    const tools = createAssistantTools(db, { whatsappNumber: '5512997594697', minLeadDays: 3 });

    const result = await tools.listarRecheios.execute!({}, { toolCallId: 'test', messages: [] } as any);

    expect(result).toEqual([
      { nome: 'Ninho com Nutella', categoria: 'Gourmet', precoExtra: 15, descricao: null },
    ]);
  });

  it('verificarDisponibilidade flags a blocked date', async () => {
    const { org } = await makeOrgWithCatalog();
    const db = getScopedPrisma(org.id);
    const tools = createAssistantTools(db, { whatsappNumber: '5512997594697', minLeadDays: 3 });

    const result = await tools.verificarDisponibilidade.execute!(
      { data: '2026-12-24' },
      { toolCallId: 'test', messages: [] } as any
    );

    expect(result).toEqual({
      data: '2026-12-24',
      prazoMinimoDias: 3,
      available: false,
      reason: 'blocked',
    });
  });

  it('verificarDisponibilidade flags a date that is too soon', async () => {
    const { org } = await makeOrgWithCatalog();
    const db = getScopedPrisma(org.id);
    const tools = createAssistantTools(db, { whatsappNumber: '5512997594697', minLeadDays: 30 });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 10);

    const result = await tools.verificarDisponibilidade.execute!(
      { data: dateStr },
      { toolCallId: 'test', messages: [] } as any
    );

    expect(result).toEqual({
      data: dateStr,
      prazoMinimoDias: 30,
      available: false,
      reason: 'too_soon',
    });
  });

  it('gerarResumoWhatsApp builds a wa.me link with the encoded summary', async () => {
    const { org } = await makeOrgWithCatalog();
    const db = getScopedPrisma(org.id);
    const tools = createAssistantTools(db, { whatsappNumber: '5512997594697', minLeadDays: 3 });

    const result = await tools.gerarResumoWhatsApp.execute!(
      { resumo: 'Bolo de chocolate, 20 fatias, para 24/12' },
      { toolCallId: 'test', messages: [] } as any
    );

    expect(result).toEqual({
      url: 'https://wa.me/5512997594697?text=Bolo%20de%20chocolate%2C%2020%20fatias%2C%20para%2024%2F12',
    });
  });
});

describe('buildAssistantInstructions', () => {
  it('includes the bakery name so the model knows who it represents', () => {
    const instructions = buildAssistantInstructions('Cinthia Rodrigues');
    expect(instructions).toContain('Cinthia Rodrigues');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/assistant-tools.test.ts`
Expected: FAIL with "Cannot find module '@/lib/assistant-tools'"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/assistant-tools.ts
import { tool } from 'ai';
import { z } from 'zod';
import { checkDateAvailability } from './availability';
import { formatWhatsappForUrl } from './utils';

// Narrow structural type -- only the Prisma calls this module actually
// makes, so tests can pass either a real getScopedPrisma(...) client (as
// they do) or, in principle, a hand-built fake, without depending on
// Prisma's full generated types. Same convention as src/lib/stock.ts.
interface AssistantDb {
  product: {
    findMany: (args: any) => Promise<any[]>;
  };
  fillingOption: {
    findMany: (args: any) => Promise<any[]>;
  };
  blockedDate: {
    findMany: (args?: any) => Promise<{ date: Date }[]>;
  };
}

export interface AssistantToolsConfig {
  whatsappNumber: string;
  minLeadDays: number;
}

export function buildAssistantInstructions(bakeryName: string): string {
  return `Você é o assistente virtual da confeitaria ${bakeryName}. Seu único objetivo é ajudar quem visita o site a entender o cardápio, os sabores disponíveis e os prazos de encomenda, usando APENAS os dados que as ferramentas te devolverem -- nunca invente preço, sabor ou disponibilidade de data.

Regras:
1. Você é uma IA, não a confeiteira. Nunca finja ser uma pessoa.
2. Responda sempre em português, num tom caloroso e direto.
3. Antes de afirmar qualquer preço, sabor ou disponibilidade, chame a ferramenta correspondente (listarBolosECategorias, listarRecheios ou verificarDisponibilidade). Nunca responda esses temas de memória.
4. Uma data "disponível" segundo a ferramenta ainda depende da confirmação final da confeiteira -- diga isso quando relevante, nunca prometa a data como fechada.
5. Se a pergunta não tiver nada a ver com a confeitaria, redirecione com educação de volta ao cardápio, sabores ou prazos.
6. Quando o cliente já tiver dado detalhes suficientes (o que quer, para quando, tema ou dúvida) e parecer pronto para seguir, chame a ferramenta gerarResumoWhatsApp com um resumo claro da conversa -- essa é a única forma de "fechar" a conversa; você mesmo nunca cria um pedido ou orçamento.`;
}

export function createAssistantTools(db: AssistantDb, config: AssistantToolsConfig) {
  return {
    listarBolosECategorias: tool({
      description:
        'Lista os bolos e outros produtos ativos do catálogo, com categoria, preço base, tamanhos/variações disponíveis e rendimento. Use isso antes de responder qualquer pergunta sobre produtos, preços ou tamanhos.',
      inputSchema: z.object({}),
      execute: async () => {
        const products = await db.product.findMany({
          where: { active: true },
          include: { category: true, variations: { where: { active: true }, orderBy: { price: 'asc' } } },
          orderBy: { createdAt: 'desc' },
        });
        return products.map((p: any) => ({
          nome: p.name,
          categoria: p.category?.name ?? null,
          precoBase: p.basePrice,
          unidade: p.unit,
          rendimento: p.yieldInfo,
          variacoes: p.variations.map((v: any) => ({
            nome: v.name,
            preco: v.price,
            fatias: v.slices,
            peso: v.weight,
          })),
        }));
      },
    }),

    listarRecheios: tool({
      description:
        'Lista os recheios/sabores ativos disponíveis, com categoria e preço extra (quando houver). Use isso antes de responder qualquer pergunta sobre sabores.',
      inputSchema: z.object({}),
      execute: async () => {
        const fillings = await db.fillingOption.findMany({
          where: { active: true },
          orderBy: { name: 'asc' },
        });
        return fillings.map((f: any) => ({
          nome: f.name,
          categoria: f.category,
          precoExtra: f.extraPrice,
          descricao: f.description,
        }));
      },
    }),

    verificarDisponibilidade: tool({
      description:
        'Verifica se uma data específica está disponível para encomenda, considerando o prazo mínimo de antecedência e as datas já bloqueadas na agenda. Use antes de dizer que uma data está livre ou ocupada.',
      inputSchema: z.object({
        data: z.string().describe('Data desejada no formato YYYY-MM-DD'),
      }),
      execute: async ({ data }: { data: string }) => {
        const blockedRows = await db.blockedDate.findMany();
        const blockedDates = blockedRows.map((b) => b.date.toISOString().slice(0, 10));
        const result = checkDateAvailability(data, blockedDates, config.minLeadDays);
        return {
          data,
          prazoMinimoDias: config.minLeadDays,
          ...result,
        };
      },
    }),

    gerarResumoWhatsApp: tool({
      description:
        'Gera o link do WhatsApp com um resumo pronto da conversa, para o cliente confirmar diretamente com a confeiteira. Use só quando o cliente já decidiu o que quer e está pronto para seguir -- nunca no início da conversa.',
      inputSchema: z.object({
        resumo: z.string().describe('Resumo da conversa em texto corrido, em português, pronto para ser enviado no WhatsApp'),
      }),
      execute: async ({ resumo }: { resumo: string }) => {
        const cleanPhone = formatWhatsappForUrl(config.whatsappNumber);
        return { url: `https://wa.me/${cleanPhone}?text=${encodeURIComponent(resumo)}` };
      },
    }),
  };
}

export type AssistantToolSet = ReturnType<typeof createAssistantTools>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/assistant-tools.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/assistant-tools.ts tests/lib/assistant-tools.test.ts
git commit -m "feat: add read-only tool-calling functions for the AI assistant"
```

---

## Task 3: `/api/assistant` route handler

**Files:**
- Create: `src/app/api/assistant/route.ts`
- Modify: `src/lib/rate-limit.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `createAssistantTools`, `buildAssistantInstructions` from `@/lib/assistant-tools` (Task 2); `getScopedPrisma` from `@/lib/db`; `getCurrentOrganization` from `@/lib/tenant`; `google` from `@ai-sdk/google`; `streamText`, `convertToModelMessages`, `createUIMessageStreamResponse`, `toUIMessageStream`, `isStepCount`, `UIMessage` from `ai`.
- Produces: a `POST` handler at `/api/assistant` that `AssistantChat.tsx` (Task 4) calls via `useChat`'s `DefaultChatTransport`.

No dedicated automated test for this file — no other API route in this repo has one either (routes stay thin; the testable logic lives in `src/lib/*`, covered by Tasks 1-2). Verified manually in Task 6.

**Important:** rate limiting in this codebase is NOT applied inside individual route handlers. `src/middleware.ts` already reads `RATE_LIMITED_ROUTES` and calls `checkRateLimit`/`getClientIp` centrally for every request, keyed by `"<METHOD> <pathname>:<ip>"`, before the route handler ever runs (see `src/middleware.ts:15-25`). The route handler below must NOT duplicate that call — it would create a second, inconsistent counter under a different key. Adding the entry in Step 1 is the entire rate-limit integration for this feature.

- [ ] **Step 1: Add the rate limit entry**

Edit `src/lib/rate-limit.ts`, inside `RATE_LIMITED_ROUTES`:

```ts
export const RATE_LIMITED_ROUTES: Record<string, RateLimitConfig> = {
  'POST /api/auth/login': { windowMs: 5 * 60 * 1000, max: 5 },
  'POST /api/quotes': { windowMs: 10 * 60 * 1000, max: 10 },
  'POST /api/coupons/validate': { windowMs: 5 * 60 * 1000, max: 15 },
  'GET /api/track': { windowMs: 5 * 60 * 1000, max: 20 },
  'POST /api/reviews': { windowMs: 10 * 60 * 1000, max: 10 },
  'POST /api/assistant': { windowMs: 10 * 60 * 1000, max: 15 },
};
```

- [ ] **Step 2: Document the new env var**

Edit `.env.example`, append at the end:

```
# Free-tier Google Gemini key for the public-site AI assistant
# (src/app/api/assistant/route.ts). Generate one at
# https://aistudio.google.com/apikey -- it's free, no credit card needed.
GOOGLE_GENERATIVE_AI_API_KEY=""
```

- [ ] **Step 3: Write the route handler**

```ts
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
    messages = body.messages;
  } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  }

  const db = getScopedPrisma(organization.id);
  const settingsRows = await db.setting.findMany();
  const settingsMap = Object.fromEntries(settingsRows.map((s) => [s.key, s.value]));

  const bakeryName = settingsMap.bakery_name || 'Cinthia Rodrigues';
  const whatsappNumber = settingsMap.whatsapp_number || '5512997594697';
  const minLeadDays = settingsMap.min_lead_days ? parseInt(settingsMap.min_lead_days) : 3;

  const tools = createAssistantTools(db, { whatsappNumber, minLeadDays });

  const result = streamText({
    model: google('gemini-3.8-flash'),
    instructions: buildAssistantInstructions(bakeryName),
    messages: await convertToModelMessages(messages),
    stopWhen: isStepCount(5),
    tools,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
    onError: () => 'Não consegui responder agora. Tente de novo em alguns instantes ou fale direto no WhatsApp.',
  });
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit -p .`
Expected: no new errors introduced by this file (pre-existing unrelated errors, if any, are out of scope).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/assistant/route.ts src/lib/rate-limit.ts .env.example
git commit -m "feat: add /api/assistant route streaming Gemini responses with catalog tools"
```

---

## Task 4: `AssistantChat` floating widget

**Files:**
- Create: `src/components/public/AssistantChat.tsx`

**Interfaces:**
- Consumes: `useChat` from `@ai-sdk/react`; `DefaultChatTransport` from `ai`; `formatWhatsappForUrl` from `@/lib/utils`; posts to `/api/assistant` (Task 3).
- Props: `{ whatsappNumber?: string }` — same shape/default as `WhatsAppFloatingButton`, used only for the pre-first-message fallback link (if the API errors before any tool ran).
- Produces: `export function AssistantChat(props: AssistantChatProps)`, mounted by Task 5.

No automated test — matches every other file under `src/components/public/*` in this repo (Navbar, Hero, OurStory, etc. have none either); verified manually in Task 6.

- [ ] **Step 1: Write the component**

```tsx
// src/components/public/AssistantChat.tsx
'use client';

import React, { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Sparkles, X, Send } from 'lucide-react';
import { formatWhatsappForUrl } from '@/lib/utils';

interface AssistantChatProps {
  whatsappNumber?: string;
}

const SUGGESTIONS = [
  'Quais sabores vocês têm?',
  'Qual o prazo mínimo para encomendar?',
  'Quanto custa um bolo para 20 pessoas?',
];

export function AssistantChat({ whatsappNumber = '5512997594697' }: AssistantChatProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/assistant' }),
  });

  const fallbackWhatsappUrl = `https://wa.me/${formatWhatsappForUrl(whatsappNumber)}?text=${encodeURIComponent(
    'Olá! Gostaria de tirar dúvidas sobre os bolos e encomendar um orçamento!'
  )}`;

  const isBusy = status === 'submitted' || status === 'streaming';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isBusy) return;
    sendMessage({ text: input });
    setInput('');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Falar com a assistente virtual"
        className="fixed bottom-24 right-6 z-40 p-4 rounded-full bg-[var(--color-accent-strong)] hover:bg-[var(--color-accent-deep)] text-white shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center"
      >
        {open ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
      </button>

      {open && (
        <div className="fixed z-40 bottom-0 right-0 left-0 sm:left-auto sm:bottom-40 sm:right-6 w-full sm:w-96 h-[80vh] sm:h-[520px] bg-white sm:rounded-3xl shadow-2xl border border-[var(--color-border)] flex flex-col overflow-hidden">
          <div className="px-4 py-3 bg-[var(--color-accent-strong)] text-white flex items-center justify-between">
            <span className="font-serif font-bold text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Assistente Virtual
            </span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fechar chat">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--color-bg)]">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-xs text-[var(--color-text-soft)]">
                  Oi! Eu sou a assistente virtual da confeitaria. Posso te contar sobre sabores, preços e prazos.
                  Não sou a confeiteira, mas te ajudo a chegar até ela com tudo pronto 🍰
                </p>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => sendMessage({ text: s })}
                      className="text-left text-xs px-3 py-2 rounded-xl bg-white border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                  message.role === 'user'
                    ? 'ml-auto bg-[var(--color-accent-strong)] text-white'
                    : 'bg-white border border-[var(--color-border)] text-[var(--color-heading)]'
                }`}
              >
                {message.parts.map((part, index) => {
                  if (part.type === 'text') {
                    return <span key={index}>{part.text}</span>;
                  }

                  if (part.type === 'tool-gerarResumoWhatsApp' && part.state === 'output-available') {
                    return (
                      <a
                        key={index}
                        href={part.output.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs"
                      >
                        Continuar no WhatsApp
                      </a>
                    );
                  }

                  return null;
                })}
              </div>
            ))}

            {isBusy && (
              <div className="max-w-[60%] rounded-2xl px-3 py-2 text-xs bg-white border border-[var(--color-border)] text-[var(--color-text-soft)]">
                digitando...
              </div>
            )}

            {error && (
              <div className="rounded-2xl px-3 py-2 text-xs bg-white border border-[var(--color-border)] text-[var(--color-heading)] space-y-2">
                <p>Não consegui responder agora. Fala direto com a gente no WhatsApp:</p>
                <a
                  href={fallbackWhatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs"
                >
                  Falar no WhatsApp
                </a>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-3 border-t border-[var(--color-border)] flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isBusy}
              placeholder="Digite sua pergunta..."
              className="flex-1 px-3 py-2 rounded-full border border-[var(--color-border)] text-xs outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
            <button
              type="submit"
              disabled={isBusy || !input.trim()}
              aria-label="Enviar"
              className="p-2.5 rounded-full bg-[var(--color-accent-strong)] hover:bg-[var(--color-accent-deep)] disabled:opacity-40 text-white transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit -p .`
Expected: no new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/public/AssistantChat.tsx
git commit -m "feat: add AssistantChat floating widget component"
```

---

## Task 5: Mount the widget on the homepage

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `AssistantChat` from `@/components/public/AssistantChat` (Task 4).

- [ ] **Step 1: Import and render it**

In `src/app/page.tsx`, add the import next to the other public component imports:

```tsx
import { WhatsAppFloatingButton } from '@/components/public/WhatsAppFloatingButton';
import { AssistantChat } from '@/components/public/AssistantChat';
```

And render it right after `<WhatsAppFloatingButton .../>`:

```tsx
      {/* Floating WhatsApp Button */}
      <WhatsAppFloatingButton whatsappNumber={settings.whatsapp_number} />

      {/* Floating AI Assistant */}
      <AssistantChat whatsappNumber={settings.whatsapp_number} />
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit -p .`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: mount the AI assistant widget on the public homepage"
```

---

## Task 6: Manual QA and Vercel preview validation

This task has no code changes of its own — it verifies Tasks 1-5 together, on the branch, before anything reaches `main`.

- [ ] **Step 1: Run the full automated test suite**

Run: `npm test`
Expected: all tests pass, including the new `availability.test.ts` and `assistant-tools.test.ts`.

- [ ] **Step 2: Add a real Gemini API key locally**

This step needs the user: generate a free key at https://aistudio.google.com/apikey and add it to the local `.env` as `GOOGLE_GENERATIVE_AI_API_KEY="..."`. Without it, `npm run dev` will start fine but the chat will hit the error/fallback state on every message (by design — Task 3's `onError` handler).

- [ ] **Step 3: Manual smoke test against `npm run dev`**

With the key in place, open the homepage, click the assistant button, and confirm:
- A question about sabores returns real filling names from the database (not invented ones).
- A question about an already-`BlockedDate` date correctly says it's unavailable.
- A question unrelated to the bakery (e.g. "conte uma piada") gets redirected back to the bakery topic instead of answered.
- After giving enough detail, the assistant offers a "Continuar no WhatsApp" button that opens `wa.me` with a sensible pre-filled message.
- Sending 16 messages within 10 minutes gets the 16th rejected with the rate-limit message.

- [ ] **Step 4: Push the branch and get the Vercel preview URL**

```bash
git push -u origin feature/assistente-ia-site
```

Then fetch the preview deployment for this branch's latest commit via the GitHub Deployments API (no Vercel CLI needed):

```bash
gh api repos/allahensus/crconfeitaria/deployments --jq '.[0].id' | \
  xargs -I{} gh api repos/allahensus/crconfeitaria/deployments/{}/statuses --jq '.[0].target_url'
```

Add `GOOGLE_GENERATIVE_AI_API_KEY` to the Vercel project's environment variables (Preview scope at least) before this deployment can answer real questions — this is also a manual step for the user, same key as Step 2.

- [ ] **Step 5: Hand the preview URL to the user**

Report the preview URL and the smoke-test results from Step 3. Do not merge `feature/assistente-ia-site` into `main` until the user explicitly confirms the preview looks right (standing preference from this project).
