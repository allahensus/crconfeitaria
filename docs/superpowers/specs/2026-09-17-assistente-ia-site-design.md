# Assistente de IA no Site Público — Design

**Data:** 2026-09-17
**Status:** Aprovado para planejamento de implementação

## Contexto

A confeiteira já responde manualmente, pelo WhatsApp, as mesmas
perguntas repetidas (sabores disponíveis, preço médio, prazo mínimo,
se tem data livre). O site já tem todos esses dados estruturados no
banco (produtos, recheios, `BlockedDate`, `min_lead_days`), mas hoje só
são exibidos, não são "conversáveis".

O objetivo deste spec é adicionar um assistente de chat com IA no site
público que responde essas perguntas usando os dados reais do
catálogo, e termina a conversa entregando ao cliente um link de
WhatsApp com um resumo pronto — sem nunca criar ou alterar nada no
banco. A decisão de negócio (fechar preço, confirmar data) continua
100% com a Cinthia, no WhatsApp.

Fora de escopo deste spec: automação de WhatsApp (o agente responder
direto no WhatsApp do negócio), criação automática de `Quote`/`Order`
pela IA, e qualquer uso do assistente dentro do admin.

## Decisões já tomadas com o usuário

- **Escopo:** só tira dúvidas com dados reais e entrega um link de
  WhatsApp com resumo. Não cria `Quote` nem `Order`.
- **Posicionamento:** botão de chat flutuante na home, ao lado do
  `WhatsAppFloatingButton` existente.
- **Provedor de IA:** Google Gemini, camada gratuita (`@ai-sdk/google`
  direto, sem passar pelo Vercel AI Gateway — decisão explícita do
  usuário para manter custo zero, aceitando o risco de a camada
  gratuita ter teto de requisições por minuto/dia).

## Arquitetura

### Componentes novos

- `src/components/public/AssistantChat.tsx` — botão flutuante +
  janela de chat. Usa `useChat` de `@ai-sdk/react`, com
  `DefaultChatTransport` apontando para `/api/assistant`.
- `src/app/api/assistant/route.ts` — Route Handler que recebe as
  mensagens, chama `streamText` (pacote `ai`) com o modelo Gemini, e
  devolve a resposta via `createUIMessageStreamResponse` +
  `toUIMessageStream`.

Nenhuma tabela nova no Prisma. Nenhuma escrita no banco a partir desse
fluxo — todas as ferramentas do assistente são somente leitura.

### Ferramentas (tool-calling) disponíveis ao modelo

Definidas em `src/app/api/assistant/route.ts` (ou extraídas para
`src/lib/assistant-tools.ts` se ficar grande), cada uma como uma
ferramenta `ai` com `inputSchema` (zod) + `execute`, chamando
diretamente o Prisma escopado pela organização atual
(`getCurrentOrganization` + `getScopedPrisma`, mesmo padrão já usado
em `src/app/api/*/route.ts`):

- `listarBolosECategorias()` — retorna produtos ativos com categoria,
  preço base, variações e unidade.
- `listarRecheios()` — retorna `FillingOption` ativos, com categoria e
  preço extra.
- `verificarDisponibilidade({ data })` — recebe uma data (string
  `YYYY-MM-DD`), cruza com `BlockedDate` e com `min_lead_days` (de
  `Setting`), e responde se a data está disponível, bloqueada, ou
  abaixo do prazo mínimo de antecedência.

O modelo é instruído a **só** afirmar preço, sabor ou disponibilidade
depois de chamar a ferramenta correspondente — nunca a partir de
conhecimento próprio.

### Guardrails (system prompt / `instructions` do `streamText`)

- Sempre se apresenta como assistente virtual da confeitaria — nunca
  finge ser a Cinthia ou uma pessoa.
- Responde só sobre a confeitaria (cardápio, sabores, prazos,
  funcionamento); pergunta fora desse tema é redirecionada
  educadamente de volta ao assunto.
- Nunca fecha pedido, nunca promete uma data como "confirmada" (só
  "disponível, mas a confirmação final é com a Cinthia") — a palavra
  final sempre é humana.
- Ao perceber que o cliente quer avançar (deu tema, data, quantidade
  de convidados), oferece o resumo + botão de WhatsApp, no mesmo
  espírito do banner "Fale Diretamente com Cinthia" já existente em
  `OurStory.tsx`.
- Responde sempre em português.

### Handoff para WhatsApp

Quando o modelo decide que é hora de encerrar com um resumo, ele chama
uma quarta ferramenta, `gerarResumoWhatsApp({ resumo })`, que apenas
formata e URL-encoda o texto recebido — não acessa o banco. O
componente detecta essa tool no `parts` da mensagem e renderiza um
botão logo abaixo da resposta, reaproveitando
`https://wa.me/${whatsappNumber}?text=...` — mesmo número que já vem
de `settings.whatsapp_number`.

### Custo e limites (proteção do free tier)

- Reaproveita `src/lib/rate-limit.ts`: nova entrada em
  `RATE_LIMITED_ROUTES` para `POST /api/assistant` (ex: 15
  mensagens / 10 min por IP — mesma ordem de grandeza das rotas
  públicas já limitadas).
- Se a chamada ao Gemini falhar (limite da camada gratuita
  esgotado, chave ausente, erro de rede), a rota devolve um erro
  tratado e o componente cai num estado de fallback: mensagem "não
  consigo responder agora" + botão direto de WhatsApp. Nunca quebra a
  página nem trava o chat carregando pra sempre.

### Configuração / variáveis de ambiente

- Nova env var `GOOGLE_GENERATIVE_AI_API_KEY` (nome exigido pelo
  `@ai-sdk/google`), adicionada a `.env.example`, ao `.env` local, e
  às variáveis de ambiente do projeto no Vercel.
- A chave é gerada pelo usuário em https://aistudio.google.com/apikey
  (gratuita) — não pode ser gerada por mim; preciso que ela seja
  colada no `.env` local e no painel do Vercel antes do deploy.
- Modelo usado: `gemini-3.8-flash` (id confirmado na documentação
  instalada do `@ai-sdk/google`, categoria "flash" = mais rápida e
  mais barata da família, adequada para FAQ curto).

## UI/UX

- Botão flutuante circular, mesmo estilo visual do
  `WhatsAppFloatingButton` (canto inferior direito), posicionado ao
  lado dele (ex: `bottom-24` vs `bottom-6`) para não se sobrepor.
- Ao clicar, abre uma janela de chat compacta (estilo "widget"),
  responsiva (tela cheia em mobile, painel flutuante em desktop).
- Mensagem inicial automática do assistente se apresentando e
  sugerindo 2-3 perguntas rápidas (chips), ex: "Quais sabores vocês
  têm?", "Qual o prazo mínimo?".
- Estado de "digitando..." enquanto a resposta transmite (via
  `status` do `useChat`).
- Botão de WhatsApp aparece inline na conversa quando o assistente
  gerar o resumo, não escondido em outro lugar.

## Testes

- Teste manual local: perguntas sobre sabores/preço/disponibilidade
  batem com os dados reais do banco de desenvolvimento.
- Teste de guardrail: perguntar algo fora do escopo (ex: "me conta uma
  piada") e confirmar que o assistente redireciona sem sair do
  personagem.
- Teste de fallback: simular `GOOGLE_GENERATIVE_AI_API_KEY` ausente ou
  inválida e confirmar que o componente cai no estado de erro com
  botão de WhatsApp, sem tela branca/erro no console do cliente.
- Teste de rate limit: confirmar que a 16ª mensagem em 10 minutos do
  mesmo IP é bloqueada com uma mensagem amigável.
- Verificação visual em mobile e desktop (o botão não pode se
  sobrepor ao `WhatsAppFloatingButton` nem ao rodapé).

## Riscos aceitos (decisão consciente do usuário)

- Camada gratuita do Gemini pode ficar indisponível em picos de
  tráfego — mitigado pelo fallback de WhatsApp direto, não por SLA.
- Sem AI Gateway, não há observability/dashboard de custo unificado do
  Vercel para esse tráfego — se o projeto crescer, migrar para o
  Gateway é a evolução natural. Decisão já tomada pelo usuário: começar
  pelo Gemini free tier e revisitar isso só se o custo/tráfego real
  exigir.
