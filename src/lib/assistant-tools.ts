// src/lib/assistant-tools.ts
import { tool } from 'ai';
import { z } from 'zod';
import { checkDateAvailability } from './availability';
import { formatWhatsappForUrl } from './utils';
import { createQuote, QuoteValidationError } from './quotes';
import type { ScopedPrismaClient } from './db';

export interface AssistantToolsConfig {
  whatsappNumber: string;
  minLeadDays: number;
  organizationId: string;
}

// Brazil abolished DST nationally in 2019, so UTC-3 is a safe fixed offset --
// no need for a timezone library just for this. Keeps this tool's notion of
// "today" aligned with the visitor's browser (AvailabilityDatePicker.tsx),
// since this route runs on Vercel in UTC.
export function nowInBrazil(): Date {
  const utcNow = new Date();
  return new Date(utcNow.getTime() - 3 * 60 * 60 * 1000);
}

export function buildAssistantInstructions(bakeryName: string, depositPercentage: number = 50, minLeadDays: number = 3): string {
  const todayStr = nowInBrazil().toISOString().slice(0, 10);
  return `Você é a Açucena, assistente virtual da confeitaria ${bakeryName}. Seu objetivo é ajudar quem visita o site a entender o cardápio, os sabores disponíveis, recomendar o produto certo quando o cliente descrever uma necessidade (não só quando pedir um nome específico), e ajudar a fechar o pedido -- usando APENAS os dados que as ferramentas te devolverem. Nunca invente preço, sabor, disponibilidade de data ou o total de um pedido.

Hoje é ${todayStr} (formato AAAA-MM-DD). Use essa data como referência pra calcular qualquer data relativa que o cliente mencionar (ex: "dia 27", "semana que vem", "mês que vem") -- nunca assuma o ano de cabeça, sempre calcule a partir de hoje.

Regras:
1. Você é uma IA, não a confeiteira. Nunca finja ser uma pessoa.
2. Responda sempre em português, num tom caloroso e direto.
3. Antes de afirmar qualquer preço, sabor ou disponibilidade de uma data específica, chame a ferramenta correspondente (listarBolosECategorias, listarRecheios ou verificarDisponibilidade). Nunca responda esses temas de memória.
4. Uma data "disponível" segundo a ferramenta ainda depende da confirmação final da confeiteira -- diga isso quando relevante, nunca prometa a data como fechada.
5. Sobre prazo mínimo em geral (sem data específica em mente): o prazo mínimo de antecedência para encomendar é de ${minLeadDays} dia(s). Se o cliente já tiver uma data específica em mente, chame verificarDisponibilidade com ela em vez de só citar esse número.
6. Sobre entrega: sim, a confeitaria faz entrega, mas depende da demanda do dia -- não é garantida, a confirmação final é sempre com a confeiteira.
7. Sobre pagamento: aceitamos Pix; o sinal sugerido para reservar a data é de ${depositPercentage}% do valor total do pedido; os detalhes finais de pagamento são combinados direto com a confeiteira.
8. Quando o cliente descrever uma necessidade em vez de pedir um produto específico (ex: "quero algo pra aniversário de criança"), pergunte o que falta pra recomendar bem -- ocasião, número de convidados/fatias aproximado, tema, preferência de sabor -- antes de recomendar. Só recomende produtos que vieram de listarBolosECategorias, nunca um produto inventado, e explique em uma frase por que cada sugestão se encaixa.
9. Se a pergunta não tiver nada a ver com a confeitaria, redirecione com educação de volta ao cardápio, sabores ou prazos.
10. Antes de coletar nome completo e WhatsApp pra fechar um pedido, avise o cliente (uma frase, uma vez por conversa) que esses dados serão usados pela confeitaria só pra esse orçamento/pedido, sem outro uso. Se o cliente seguir depois disso sem se opor, chame fecharPedido com lgpdAccepted: true; se ele recusar ou pedir pra não usar os dados, não chame fecharPedido -- explique que sem isso não dá pra registrar o pedido, e ofereça o contato direto pelo WhatsApp (gerarResumoWhatsApp) como alternativa.
11. Quando o cliente já tiver dado nome completo, WhatsApp, o produto/variação exato, a data e a quantidade, E tiver dito explicitamente que quer fechar (algo como "sim, pode fechar" -- não chame só porque a conversa avançou), chame a ferramenta fecharPedido. Isso NÃO confirma o pedido: sempre explique que a confeiteira ainda vai revisar antes de qualquer coisa virar certeza. Quando fecharPedido tiver sucesso, sempre incentive o cliente a clicar no link de WhatsApp que aparece -- é o que efetivamente avisa a confeiteira do pedido novo, então enfatize isso (ex: "clica aqui pra avisar a confeiteira agora"). Se fecharPedido devolver um erro, explique o problema ao cliente com suas palavras e ofereça chamar gerarResumoWhatsApp como alternativa.
12. Se o cliente não tiver dado detalhes suficientes pra fechar (ex: quer algo fora do catálogo, várias combinações de recheio, ou só quer confirmar detalhes com a confeiteira), chame gerarResumoWhatsApp com um resumo claro da conversa -- essa é a forma alternativa de encaminhar; você mesma nunca inventa um pedido sem os dados completos.`;
}

export function createAssistantTools(db: ScopedPrismaClient, config: AssistantToolsConfig) {
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
        const result = checkDateAvailability(data, blockedDates, config.minLeadDays, nowInBrazil());
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

    fecharPedido: tool({
      description:
        'Cria um pedido de verdade pra confeiteira revisar e aprovar. Só chame isso depois de já ter nome completo, WhatsApp, o produto/variação exato, a data do evento e a quantidade confirmados pelo cliente, E o cliente já ter dito explicitamente que quer fechar. Isso NÃO confirma o pedido -- a confeiteira ainda revisa antes de qualquer coisa virar certeza.',
      inputSchema: z.object({
        customerName: z.string().min(1),
        customerWhatsapp: z.string().min(8),
        productName: z.string().describe('Nome exato do produto, como retornado por listarBolosECategorias'),
        variation: z.string().optional().describe('Nome exato da variação, se houver, como retornado por listarBolosECategorias'),
        quantity: z.number().int().positive(),
        eventDate: z.string().describe('Data desejada no formato YYYY-MM-DD'),
        themeNotes: z.string().optional(),
        lgpdAccepted: z
          .boolean()
          .describe(
            'true somente se você já explicou ao cliente, nesta conversa, que os dados serão usados pela confeitaria só para o orçamento/pedido e ele seguiu sem se opor; false se ele recusou ou você não chegou a avisar.'
          ),
      }),
      execute: async ({ customerName, customerWhatsapp, productName, variation, quantity, eventDate, themeNotes, lgpdAccepted }) => {
        if (!lgpdAccepted) {
          return {
            erro: 'Antes de registrar o pedido, preciso avisar que seus dados (nome e WhatsApp) serão usados pela confeitaria só pra esse orçamento/pedido. Posso seguir com isso?',
          };
        }

        const product = await db.product.findFirst({
          where: { name: { equals: productName, mode: 'insensitive' }, active: true },
          include: { variations: { where: { active: true } } },
        });
        if (!product) {
          return { erro: `Não encontrei "${productName}" no catálogo ativo. Confirme o nome exato com listarBolosECategorias antes de tentar de novo.` };
        }

        let unitPrice = product.basePrice;
        let variationName: string | undefined;
        if (variation) {
          const matched = product.variations.find(
            (v) => v.name.toLowerCase() === variation.toLowerCase()
          );
          if (!matched) {
            return { erro: `"${variation}" não é uma variação válida de "${product.name}". Confirme com listarBolosECategorias.` };
          }
          unitPrice = matched.price;
          variationName = matched.name;
        }

        const finalTotal = Math.round(unitPrice * quantity * 100) / 100;

        try {
          const { quote, whatsappUrl } = await createQuote(db, config.organizationId, {
            customerName,
            customerWhatsapp,
            productId: product.id,
            productName: product.name,
            variation: variationName,
            quantity,
            unitPrice,
            eventDate,
            finalTotal,
            subtotal: finalTotal,
            themeNotes,
            preferredPaymentMethod: 'A combinar',
            createdByAssistant: true,
            lgpdAccepted: true,
          });
          return {
            numeroPedido: quote.quoteNumber,
            resumo: `Pedido ${quote.quoteNumber} registrado para revisão da confeiteira.`,
            // Same wa.me link createQuote already builds for the public
            // budget calculator -- the pedido only really reaches the
            // confeiteira once the customer taps this and sends it
            // themselves; the admin queue alone has no push notification.
            whatsappUrl,
          };
        } catch (err) {
          if (err instanceof QuoteValidationError) {
            return { erro: err.message };
          }
          return { erro: 'Não consegui registrar o pedido agora. Tente novamente ou fale direto no WhatsApp.' };
        }
      },
    }),
  };
}

export type AssistantToolSet = ReturnType<typeof createAssistantTools>;
