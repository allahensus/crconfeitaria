# PRD — CR Confeitaria

## 1. Visão geral

CR Confeitaria é uma plataforma SaaS multi-tenant para confeitarias artesanais que vendem sob encomenda (bolos, bentô cakes, biscoitos amanteigados). Ela substitui o fluxo manual de "orçamento e pedido por WhatsApp + planilha" por um site próprio de orçamento e um painel administrativo único para gestão de pedidos, clientes, estoque e financeiro.

O primeiro tenant real é a **Confeitaria Cinthia Rodrigues**, e a arquitetura já nasce multi-tenant (uma organização por subdomínio) para permitir replicar para outras confeiteiras sem duplicar código.

## 2. Problema

Confeiteiras autônomas ou com equipe pequena hoje dependem de:
- Orçamentos calculados manualmente a cada conversa no WhatsApp, sujeitos a erro e demora.
- Controle de pedidos e prazos de entrega em planilha ou agenda física, sem visão consolidada.
- Financeiro (entradas, despesas, sinais e pagamentos) anotado à parte, sem relação direta com os pedidos.
- Nenhum controle de estoque de insumos ligado ao que efetivamente foi vendido.

Isso gera retrabalho, risco de esquecer prazos/pagamentos e nenhuma visibilidade real de margem por produto.

## 3. Objetivo do produto

Dar à confeiteira uma ferramenta única que:
1. Deixa o cliente montar e enviar o próprio orçamento, 24/7, sem depender de resposta manual.
2. Transforma esse orçamento em pedido rastreável, com status claro do início à entrega.
3. Conecta pedido → estoque (baixa automática de insumos pela receita do produto) → financeiro (recebimento e despesas).
4. Funciona para mais de uma confeitaria na mesma base de código (multi-tenant por subdomínio).

## 4. Público-alvo / personas

| Persona | Papel no sistema | Necessidade principal |
|---|---|---|
| Dona da confeitaria | `OWNER` | Visão completa: financeiro, equipe, configurações, todos os pedidos |
| Equipe de produção/atendimento | `STAFF` | Ver e atualizar pedidos, estoque e clientes, sem acesso a financeiro/equipe |
| Cliente final | Visitante público | Montar orçamento, acompanhar disponibilidade de datas, avaliar após a entrega |

## 5. Escopo (funcionalidades incluídas)

### Loja pública
- Catálogo de produtos por categoria, com variações (tamanho, número de fatias) e opções de recheio/cobertura com preço adicional.
- Calculadora de orçamento: monta o pedido, aplica cupom de desconto, calcula sinal sugerido.
- Calendário público com datas bloqueadas pela confeiteira (agenda cheia, folga).
- Galeria de fotos e depoimentos de clientes.
- Página de avaliação pós-entrega, com link enviado à cliente.
- Metadados de SEO e Open Graph dinâmicos por organização (nome da loja, endereço).

### Painel administrativo (`/admin`)
- **Orçamentos**: lista, aprovação/rejeição, conversão em pedido.
- **Pedidos**: pipeline de status (`NOVO → AGUARDANDO_CONFIRMACAO → CONFIRMADO → PAGAMENTO_PENDENTE → EM_PRODUCAO → PRONTO → ENTREGUE`, com `CANCELADO` à parte), controle de pagamento (pendente/parcial/pago).
- **Clientes**: cadastro com WhatsApp, CPF, endereço, aniversário, consentimento LGPD, total gasto e nº de pedidos.
- **Financeiro**: receitas e despesas categorizadas, pagamentos por pedido, cobrança via Pix.
- **Estoque (Insumos)**: cadastro de ingredientes com preço e quantidade em pacote, receita por produto, baixa automática de estoque a cada pedido confirmado, alerta de estoque baixo.
- **Cupons**: percentual ou valor fixo, limite de uso total, uso único por cliente, validade.
- **Equipe**: gestão de usuários com papel `OWNER`/`STAFF`, proteção contra remover o último `OWNER`.
- **Catálogo**: produtos, variações, categorias, galeria, depoimentos.
- **Calendário**: bloqueio de datas de entrega.
- **Configurações**: nome da loja, WhatsApp, Instagram, endereço, mensagem de boas-vindas, prazo mínimo de entrega.

### Requisitos não funcionais
- **Multi-tenant** por subdomínio, com dados isolados por `organizationId` em todas as tabelas.
- **Autenticação**: sessão via JWT em cookie httpOnly, 7 dias de validade; permissões `OWNER`-only revalidadas no banco (não confiam apenas na claim do token).
- **LGPD**: consentimento do cliente registrado no cadastro.
- **Proteção básica de borda**: rate limiting em rotas públicas sensíveis e checagem de `Origin` contra CSRF nas rotas mutáveis da API.

## 6. Fora de escopo (por ora)

- Cobrança automatizada via gateway de pagamento (Pix hoje é conferido manualmente pela confeiteira).
- Notificações automáticas por e-mail/SMS/push para o cliente (o fluxo de acompanhamento hoje é via link + WhatsApp).
- Aplicativo mobile nativo.
- Onboarding self-service de novas confeitarias (hoje a criação de uma nova organização é manual).

## 7. Fluxo principal (end-to-end)

1. Cliente acessa a loja, monta o orçamento (produto, variação, recheio, cobertura, cupom) e envia.
2. Confeiteira vê o orçamento em **Admin → Orçamentos**, aprova ou ajusta.
3. Orçamento aprovado vira **Pedido**, com data de entrega e status inicial.
4. Conforme a produção avança, a confeiteira atualiza o status do pedido; ao confirmar, o estoque de insumos é baixado com base na receita do produto.
5. Pagamentos (sinal e restante) são registrados em **Admin → Financeiro**, atualizando `paymentStatus` do pedido.
6. Após a entrega, a cliente recebe o link de avaliação e deixa um depoimento, que pode ser publicado na loja.

## 8. Roadmap / próximos passos

Já entregue (ver `docs/superpowers/plans/`):
- Fundação multi-tenant (`2026-08-25-multi-tenant-foundation.md`)
- Permissões por papel (`2026-09-03-role-based-permissions.md`)
- Baixa automática de estoque (`2026-09-05-automatic-stock-deduction.md`)

Candidatos a próximos passos:
- Onboarding self-service para novas confeitarias (hoje é manual via seed/migração).
- Notificações automáticas de status de pedido para o cliente.
- Integração com gateway de pagamento para conciliação automática do Pix.
