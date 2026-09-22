# Permissão por Papel (Dona vs Funcionária) — Design

**Data:** 2026-09-03
**Status:** Aprovado para planejamento de implementação

## Contexto

O campo `User.role` existe desde a fundação multi-tenant (ver
`2026-08-25-multi-tenant-foundation-design.md`, que já previa
`OWNER | STAFF`), mas hoje é só um texto livre com default `"OWNER"` —
nenhuma rota do painel checa esse valor. Só existe uma conta por
organização (criada pelo script de seed), e não há nenhuma tela pra
criar outras.

Isso vira um problema assim que a Cinthia (ou qualquer outra confeitaria
usando o sistema) quiser dar acesso ao painel pra uma funcionária: hoje
a única opção é dar a mesma conta e senha da dona, com acesso total a
financeiro, cupons e tudo mais.

## Objetivo deste spec

1. Fazer `role` valer alguma coisa: dois papéis fixos, `OWNER` e
   `STAFF`, com `STAFF` impedida de ler/escrever em Financeiro e Cupons
   (via API, não só escondido na UI).
2. Dar à dona uma tela (`/admin/equipe`) pra criar, editar o papel e
   remover contas de funcionária dentro da própria organização.

Fora de escopo: papéis granulares por permissão individual (só os dois
fixos), convite por e-mail/link (a dona digita a senha inicial
diretamente), e qualquer papel além de OWNER/STAFF.

## Arquitetura

### Modelo de dados

Nenhuma migração de schema — `User.role` já existe como `String`. O
conjunto de valores válidos (`'OWNER' | 'STAFF'`) vira uma constante
compartilhada em `src/lib/auth.ts`, validada na camada de aplicação (não
um enum de banco), consistente com o resto do schema (`Order.status`,
`Coupon.discountType` etc. também são strings validadas em código, não
enums do Postgres).

`AuthSession` (já usada no JWT) já carrega `role: string` — nenhuma
mudança no cookie/token.

### Onde a permissão é checada

Cada rota de API já faz sua própria checagem de sessão logo no início
(`if (!session) return 401`). Sigo esse padrão exatamente: adiciono uma
checagem de papel logo em seguida, nas 4 rotas que devem ficar
restritas à dona:

- `src/app/api/finance/route.ts` (GET, POST)
- `src/app/api/finance/[id]/route.ts` (PUT, DELETE)
- `src/app/api/coupons/route.ts` (GET, POST)
- `src/app/api/coupons/[id]/route.ts` (PUT, DELETE)

(`/api/coupons/validate` continua pública — é usada pelo site pra
clientes validarem um cupom no orçamento, não expõe nada sensível.)

Novo helper em `src/lib/auth.ts`:

```ts
export function isOwner(session: AuthSession): boolean {
  return session.role === 'OWNER';
}
```

Usado assim em cada rota restrita:

```ts
const session = await getSession();
if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
if (!isOwner(session)) return NextResponse.json({ error: 'Acesso restrito à dona da loja' }, { status: 403 });
```

Considerei centralizar isso no `middleware.ts` (que hoje só cuida de
subdomínio) em vez de repetir em 4 arquivos, mas isso introduziria um
padrão de autorização novo nesse projeto — hoje toda autenticação é
feita rota a rota, nunca no middleware. Pra só 4 arquivos, não compensa
quebrar a convenção existente.

### Gestão de equipe (`/api/team`)

Novo `src/app/api/team/route.ts`:
- `GET`: lista usuários da organização (nome, e-mail, papel — nunca a
  senha). Só `OWNER`.
- `POST`: cria um novo usuário (nome, e-mail, senha, papel) na mesma
  organização da sessão. Só `OWNER`. Senha passa por `bcrypt.hash`
  (mesmo padrão do login). E-mail duplicado retorna 400.

Novo `src/app/api/team/[id]/route.ts`:
- `PUT`: atualiza nome, papel e opcionalmente senha (se enviada) de um
  usuário da própria organização. Só `OWNER`.
- `DELETE`: remove um usuário da própria organização. Só `OWNER`.

**Trava de auto-exclusão/auto-rebaixamento:** antes de aplicar `PUT`
(mudando o papel de `OWNER` para `STAFF`) ou `DELETE` num usuário que é
`OWNER`, a rota conta quantos `OWNER` ativos existem na organização. Se
for o último, retorna 400 (`"Não é possível remover a última conta de
dona da loja."`) em vez de deixar acontecer — evita a organização
inteira ficar sem ninguém com acesso a Financeiro/Cupons/Equipe.

### Painel — `/admin/equipe`

Nova página, mesmo padrão de CRUD das telas de Depoimentos/Galeria:
lista de usuários (nome, e-mail, papel, badge "Você" no usuário
logado), modal de criar/editar (nome, e-mail, senha — opcional ao
editar, deixa em branco pra manter a atual —, papel via select), botão
excluir com confirmação.

### UX no menu e nas páginas restritas

`AdminSidebar` passa a buscar a sessão (`fetch('/api/auth/me')`) uma vez
ao montar, e só renderiza os itens "Financeiro", "Cupons" e "Equipe" no
menu quando `role === 'OWNER'`. Enquanto a sessão carrega, esses itens
ficam ocultos por padrão (evita "piscar" e depois sumir).

As três páginas correspondentes (`/admin/financeiro`, `/admin/cupons`,
`/admin/equipe`) fazem a mesma checagem client-side: se `role !==
'OWNER'`, mostram um estado "Acesso restrito à dona da loja" em vez do
conteúdo, sem chegar a tentar carregar dados (que a API recusaria de
qualquer forma). Essa é só uma camada de UX — a proteção real é sempre
a checagem 403 no servidor.

## Casos de borda

- **E-mail duplicado ao criar funcionária** → 400 com mensagem clara
  (mesmo padrão já usado em `POST /api/coupons` pra código duplicado).
- **Funcionária acessa a API restrita direto (sem passar pela UI)** →
  403, mesma resposta que toda outra rota autenticada já usa pra nego
  de acesso.
- **Dona tenta remover/rebaixar a si mesma sendo a única dona** →
  bloqueado com 400 (ver trava acima). Se houver mais de uma conta
  `OWNER`, a ação é permitida normalmente.
- **Funcionária tenta criar/editar/remover outro usuário via
  `/api/team`** → 403 (só `OWNER` acessa essas rotas).

## Teste

Sem acesso a navegador nesta sessão (mesma limitação das duas features
anteriores) — verificação via API com cookies reais:

1. Criar uma conta `STAFF` de teste via `/api/team` (como `OWNER`).
2. Logar como essa conta `STAFF` e confirmar 403 em `/api/finance` e
   `/api/coupons`, e 200 nas rotas não restritas (ex: `/api/orders`).
3. Confirmar que a tentativa de rebaixar/remover a única conta `OWNER`
   é bloqueada.
4. Apagar as contas de teste ao final.
5. `npx tsc --noEmit` e `npm test` (suíte completa) antes de considerar
   pronto.
