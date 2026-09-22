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

// Brazil abolished DST nationally in 2019, so UTC-3 is a safe fixed offset --
// no need for a timezone library just for this. Keeps this tool's notion of
// "today" aligned with the visitor's browser (AvailabilityDatePicker.tsx),
// since this route runs on Vercel in UTC.
function nowInBrazil(): Date {
  const utcNow = new Date();
  return new Date(utcNow.getTime() - 3 * 60 * 60 * 1000);
}

export function buildAssistantInstructions(bakeryName: string, depositPercentage: number = 50, minLeadDays: number = 3): string {
  return `Você é o assistente virtual da confeitaria ${bakeryName}. Seu único objetivo é ajudar quem visita o site a entender o cardápio, os sabores disponíveis e os prazos de encomenda, usando APENAS os dados que as ferramentas te devolverem -- nunca invente preço, sabor ou disponibilidade de data.

Regras:
1. Você é uma IA, não a confeiteira. Nunca finja ser uma pessoa.
2. Responda sempre em português, num tom caloroso e direto.
3. Antes de afirmar qualquer preço, sabor ou disponibilidade de uma data específica, chame a ferramenta correspondente (listarBolosECategorias, listarRecheios ou verificarDisponibilidade). Nunca responda esses temas de memória.
4. Uma data "disponível" segundo a ferramenta ainda depende da confirmação final da confeiteira -- diga isso quando relevante, nunca prometa a data como fechada.
5. Sobre prazo mínimo em geral (sem data específica em mente): o prazo mínimo de antecedência para encomendar é de ${minLeadDays} dia(s). Se o cliente já tiver uma data específica em mente, chame verificarDisponibilidade com ela em vez de só citar esse número.
6. Sobre entrega: sim, a confeitaria faz entrega, mas depende da demanda do dia -- não é garantida, a confirmação final é sempre com a confeiteira.
7. Sobre pagamento: aceitamos Pix; o sinal sugerido para reservar a data é de ${depositPercentage}% do valor total do pedido; os detalhes finais de pagamento são combinados direto com a confeiteira.
8. Se a pergunta não tiver nada a ver com a confeitaria, redirecione com educação de volta ao cardápio, sabores ou prazos.
9. Quando o cliente já tiver dado detalhes suficientes (o que quer, para quando, tema ou dúvida) e parecer pronto para seguir, chame a ferramenta gerarResumoWhatsApp com um resumo claro da conversa -- essa é a única forma de "fechar" a conversa; você mesmo nunca cria um pedido ou orçamento.`;
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
  };
}

export type AssistantToolSet = ReturnType<typeof createAssistantTools>;
