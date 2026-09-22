// tests/lib/assistant-tools.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { resetTestDatabase } from '../helpers/testDb';
import { prisma } from '@/lib/prisma';
import { getScopedPrisma } from '@/lib/db';
import { createAssistantTools, buildAssistantInstructions, nowInBrazil } from '@/lib/assistant-tools';

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
    const tools = createAssistantTools(db, { whatsappNumber: '5512997594697', minLeadDays: 3, organizationId: org.id });

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
    const tools = createAssistantTools(db, { whatsappNumber: '5512997594697', minLeadDays: 3, organizationId: org.id });

    const result = await tools.listarRecheios.execute!({}, { toolCallId: 'test', messages: [] } as any);

    expect(result).toEqual([
      { nome: 'Ninho com Nutella', categoria: 'Gourmet', precoExtra: 15, descricao: null },
    ]);
  });

  it('verificarDisponibilidade flags a blocked date', async () => {
    const { org } = await makeOrgWithCatalog();
    const db = getScopedPrisma(org.id);
    const tools = createAssistantTools(db, { whatsappNumber: '5512997594697', minLeadDays: 3, organizationId: org.id });

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
    const tools = createAssistantTools(db, { whatsappNumber: '5512997594697', minLeadDays: 30, organizationId: org.id });

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
    const tools = createAssistantTools(db, { whatsappNumber: '5512997594697', minLeadDays: 3, organizationId: org.id });

    const result = await tools.gerarResumoWhatsApp.execute!(
      { resumo: 'Bolo de chocolate, 20 fatias, para 24/12' },
      { toolCallId: 'test', messages: [] } as any
    );

    expect(result).toEqual({
      url: 'https://wa.me/5512997594697?text=Bolo%20de%20chocolate%2C%2020%20fatias%2C%20para%2024%2F12',
    });
  });

  it('fecharPedido creates a Quote with createdByAssistant true and the catalog price, never a model-supplied one', async () => {
    const { org } = await makeOrgWithCatalog();
    const db = getScopedPrisma(org.id);
    const tools = createAssistantTools(db, { whatsappNumber: '5512997594697', minLeadDays: 3, organizationId: org.id });

    const result = await tools.fecharPedido.execute!(
      {
        customerName: 'Maria Silva',
        customerWhatsapp: '11999998888',
        productName: 'Bolo de Chocolate',
        variation: '20 a 25 fatias',
        quantity: 1,
        eventDate: '2027-03-10',
      },
      { toolCallId: 'test', messages: [] } as any
    );

    expect(result).toHaveProperty('numeroPedido');
    expect((result as any).numeroPedido).toMatch(/^ORC-\d{4}-0001$/);

    const quote = await prisma.quote.findFirst({ where: { organizationId: org.id } });
    expect(quote?.createdByAssistant).toBe(true);
    expect(quote?.status).toBe('PENDING');
    expect(quote?.finalTotal).toBe(150); // the variation's real price, not something the model could have invented
  });

  it('fecharPedido refuses an unknown product instead of guessing a price', async () => {
    const { org } = await makeOrgWithCatalog();
    const db = getScopedPrisma(org.id);
    const tools = createAssistantTools(db, { whatsappNumber: '5512997594697', minLeadDays: 3, organizationId: org.id });

    const result = await tools.fecharPedido.execute!(
      {
        customerName: 'Maria Silva',
        customerWhatsapp: '11999998888',
        productName: 'Bolo Que Não Existe',
        quantity: 1,
        eventDate: '2027-03-10',
      },
      { toolCallId: 'test', messages: [] } as any
    );

    expect(result).toHaveProperty('erro');
    const quote = await prisma.quote.findFirst({ where: { organizationId: org.id } });
    expect(quote).toBeNull();
  });

  it('fecharPedido returns a generic message instead of leaking an unexpected (non-validation) error', async () => {
    const { org } = await makeOrgWithCatalog();
    const db = getScopedPrisma(org.id);
    // db stays scoped to the real org (so the product lookup succeeds), but
    // config.organizationId points at an org that doesn't exist. createQuote's
    // customer.upsert is intentionally NOT auto-scoped by getScopedPrisma, so
    // it inserts a Customer row with this nonexistent organizationId -- a
    // real Postgres foreign-key violation, i.e. a genuine unexpected error,
    // not a QuoteValidationError. No mocking: this exercises the real
    // DB-backed failure path.
    const tools = createAssistantTools(db, {
      whatsappNumber: '5512997594697',
      minLeadDays: 3,
      organizationId: '00000000-0000-0000-0000-000000000000',
    });

    const result = await tools.fecharPedido.execute!(
      {
        customerName: 'Maria Silva',
        customerWhatsapp: '11999997777',
        productName: 'Bolo de Chocolate',
        variation: '20 a 25 fatias',
        quantity: 1,
        eventDate: '2027-03-10',
      },
      { toolCallId: 'test', messages: [] } as any
    );

    expect(result).toEqual({
      erro: 'Não consegui registrar o pedido agora. Tente novamente ou fale direto no WhatsApp.',
    });
  });
});

describe('buildAssistantInstructions', () => {
  it('includes the bakery name so the model knows who it represents', () => {
    const instructions = buildAssistantInstructions('Cinthia Rodrigues');
    expect(instructions).toContain('Cinthia Rodrigues');
  });

  it('names the agent Açucena', () => {
    const instructions = buildAssistantInstructions('Cinthia Rodrigues');
    expect(instructions).toContain('Açucena');
  });

  it("states today's date so the model doesn't guess a stale year for relative dates", () => {
    // Regression test: production logs showed the model calling
    // verificarDisponibilidade with { data: '2025-09-27' } when the real
    // current year was 2026 -- the prompt never stated today's date, so the
    // model had no anchor and guessed a stale year from its own training,
    // making a genuinely available date look unavailable to a real customer.
    const instructions = buildAssistantInstructions('Cinthia Rodrigues');
    const todayStr = nowInBrazil().toISOString().slice(0, 10);
    expect(instructions).toContain(todayStr);
  });
});
